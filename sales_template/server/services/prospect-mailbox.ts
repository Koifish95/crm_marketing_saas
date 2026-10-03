import net from 'node:net'
import tls from 'node:tls'

export type OutboundMail = {
  messageId: string
  fromName: string
  fromAddress: string
  to: string
  subject: string
  text: string
  html: string | null
}

export type InboundMail = {
  messageId: string | null
  inReplyTo: string | null
  subject: string
  text: string
}

export type ProspectMailbox = {
  send: (message: OutboundMail) => Promise<{ providerMessageId: string }>
  poll: () => Promise<InboundMail[]>
}

export function createFixtureMailbox() {
  const sent: OutboundMail[] = []
  const inbound: InboundMail[] = []
  const mailbox: ProspectMailbox & {
    sent: OutboundMail[]
    pushInbound: (message: InboundMail) => void
  } = {
    sent,
    pushInbound(message) {
      inbound.push(message)
    },
    async send(message) {
      sent.push(message)
      return { providerMessageId: message.messageId }
    },
    async poll() {
      return inbound.splice(0, inbound.length)
    },
  }
  return mailbox
}

type MailboxConfig = {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  imapHost: string
  imapPort: number
  mailboxUsername: string
  mailboxPassword: string
}

export function createSmtpImapMailbox(config: MailboxConfig): ProspectMailbox {
  return {
    async send(message) {
      await smtpSend(config, message)
      return { providerMessageId: message.messageId }
    },
    async poll() {
      return imapPollUnseen(config)
    },
  }
}

function buildRaw(message: OutboundMail) {
  const from = `${message.fromName} <${message.fromAddress}>`
  const headers = [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    `Message-ID: ${message.messageId}`,
    'MIME-Version: 1.0',
  ]
  if (!message.html) {
    return `${headers.join('\r\n')}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message.text}\r\n`
  }
  const boundary = `nuxxion-${Math.random().toString(16).slice(2)}`
  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    message.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    message.html,
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function dotStuff(raw: string) {
  return raw.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..')
}

class LineProtocol {
  private buffer = ''
  private lines: string[] = []
  private waiters: Array<(line: string) => void> = []
  private onData: (chunk: string) => void

  constructor(private socket: net.Socket | tls.TLSSocket) {
    socket.setEncoding('utf8')
    this.onData = (chunk: string) => {
      this.buffer += chunk
      let split = this.buffer.indexOf('\n')
      while (split >= 0) {
        const line = this.buffer.slice(0, split).replace(/\r$/, '')
        this.buffer = this.buffer.slice(split + 1)
        const waiter = this.waiters.shift()
        if (waiter) {
          waiter(line)
        } else {
          this.lines.push(line)
        }
        split = this.buffer.indexOf('\n')
      }
    }
    socket.on('data', this.onData)
  }

  stop() {
    this.socket.off('data', this.onData)
  }

  readLine() {
    const queued = this.lines.shift()
    if (queued !== undefined) {
      return Promise.resolve(queued)
    }
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Mail server timed out.')), 20_000)
      this.waiters.push((line) => {
        clearTimeout(timer)
        resolve(line)
      })
    })
  }

  async readReply() {
    const lines: string[] = []
    let line = await this.readLine()
    const code = line.slice(0, 3)
    lines.push(line)
    while (line[3] === '-') {
      line = await this.readLine()
      lines.push(line)
    }
    return { code, line, text: lines.join('\n') }
  }

  write(command: string) {
    this.socket.write(`${command}\r\n`)
  }
}

function connectSocket(host: string, port: number, secure: boolean) {
  return new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port })
    socket.once('error', reject)
    socket.once(secure ? 'secureConnect' : 'connect', () => resolve(socket))
  })
}

async function smtpSend(config: MailboxConfig, message: OutboundMail) {
  let socket = await connectSocket(config.smtpHost, config.smtpPort, config.smtpSecure)
  const proto = new LineProtocol(socket)
  try {
    const greeting = await proto.readReply()
    if (!greeting.code.startsWith('2')) {
      throw new Error('SMTP server rejected the connection.')
    }
    proto.write('EHLO nuxxion')
    const ehlo = await proto.readReply()
    if (!config.smtpSecure && ehlo.text.toUpperCase().includes('STARTTLS')) {
      proto.write('STARTTLS')
      const start = await proto.readReply()
      if (!start.code.startsWith('2')) {
        throw new Error('SMTP server refused STARTTLS.')
      }
      proto.stop()
      socket = await new Promise((resolve, reject) => {
        const upgraded = tls.connect({ socket, servername: config.smtpHost })
        upgraded.once('error', reject)
        upgraded.once('secureConnect', () => resolve(upgraded))
      })
      const secureProto = new LineProtocol(socket)
      secureProto.write('EHLO nuxxion')
      await secureProto.readReply()
      await smtpAuthAndSend(secureProto, config, message)
      return
    }
    await smtpAuthAndSend(proto, config, message)
  } finally {
    socket.end()
  }
}

async function smtpAuthAndSend(proto: LineProtocol, config: MailboxConfig, message: OutboundMail) {
  proto.write('AUTH LOGIN')
  await proto.readReply()
  proto.write(Buffer.from(config.mailboxUsername).toString('base64'))
  await proto.readReply()
  proto.write(Buffer.from(config.mailboxPassword).toString('base64'))
  const auth = await proto.readReply()
  if (!auth.code.startsWith('2')) {
    throw new Error(`SMTP login failed. ${auth.line}`)
  }
  proto.write(`MAIL FROM:<${config.mailboxUsername}>`)
  const from = await proto.readReply()
  if (!from.code.startsWith('2')) {
    throw new Error('SMTP rejected the sender.')
  }
  proto.write(`RCPT TO:<${message.to}>`)
  const to = await proto.readReply()
  if (!to.code.startsWith('2')) {
    throw new Error('SMTP rejected the recipient.')
  }
  proto.write('DATA')
  const data = await proto.readReply()
  if (!data.code.startsWith('3')) {
    throw new Error('SMTP refused the message.')
  }
  proto.write(`${dotStuff(buildRaw(message))}\r\n.`)
  const sent = await proto.readReply()
  if (!sent.code.startsWith('2')) {
    throw new Error('SMTP did not accept the message.')
  }
  proto.write('QUIT')
}

function imapQuote(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function headerValue(headers: string, name: string) {
  const pattern = new RegExp(`^${name}:\\s*(.+)$`, 'im')
  return headers.match(pattern)?.[1]?.trim() ?? null
}

async function imapPollUnseen(config: MailboxConfig): Promise<InboundMail[]> {
  const socket = await connectSocket(config.imapHost, config.imapPort, true)
  const proto = new LineProtocol(socket)
  const messages: InboundMail[] = []
  try {
    await proto.readLine()
    proto.write(`A1 LOGIN ${imapQuote(config.mailboxUsername)} ${imapQuote(config.mailboxPassword)}`)
    const login = await readImapTag(proto, 'A1')
    if (!login.endsWith('OK')) {
      throw new Error('IMAP login failed.')
    }
    proto.write('A2 SELECT INBOX')
    await readImapTag(proto, 'A2')
    proto.write('A3 UID SEARCH UNSEEN')
    const searchLines: string[] = []
    let searchDone = ''
    while (!searchDone) {
      const line = await proto.readLine()
      if (line.startsWith('A3 ')) {
        searchDone = line
      } else {
        searchLines.push(line)
      }
    }
    const uids = searchLines.join(' ').replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean)
    for (const uid of uids.slice(0, 20)) {
      proto.write(`A4 UID FETCH ${uid} (BODY.PEEK[])`)
      const fetched: string[] = []
      let done = ''
      while (!done) {
        const line = await proto.readLine()
        if (line.startsWith('A4 ')) {
          done = line
        } else {
          fetched.push(line)
        }
      }
      const raw = fetched.join('\n')
      const splitAt = raw.search(/\r?\n\r?\n/)
      const headers = splitAt >= 0 ? raw.slice(0, splitAt) : raw
      const text = splitAt >= 0 ? raw.slice(splitAt).trim() : ''
      messages.push({
        messageId: headerValue(headers, 'message-id'),
        inReplyTo: headerValue(headers, 'in-reply-to') ?? headerValue(headers, 'references'),
        subject: headerValue(headers, 'subject') ?? '',
        text: text.slice(0, 4000),
      })
      proto.write(`A5 UID STORE ${uid} +FLAGS (\\Seen)`)
      await readImapTag(proto, 'A5')
    }
    proto.write('A6 LOGOUT')
  } finally {
    socket.end()
  }
  return messages
}

async function readImapTag(proto: LineProtocol, tag: string) {
  while (true) {
    const line = await proto.readLine()
    if (line.startsWith(`${tag} `)) {
      return line
    }
  }
}
