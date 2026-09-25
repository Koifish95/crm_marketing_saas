# New customer runbook

Audience: SIC operator taking a **signed** customer from nothing to handoff.

Architecture: [Platform](4 - platform.md). Commands: [Operator guide](11 - sic-operator-guide.md). Stop list: [Safety](10 - safety.md).

**Not live-proven as official S7/S8:** buying a VPS, registrar DNS, and Let’s Encrypt on a real academy hostname. Those steps are included and labeled.

---

## Checklist

### 0. Commercial (external)

- [ ] Signed customer; you know legal name, timezone, admin email, which **product** (Martial Arts and/or Sales)
- [ ] You are **not** treating the original gym implementation as this customer
- [ ] Slug is not reserved (`lab-acme`, `renzo`, `martial-arts`, `webhosting*`)

### 1. Hosting node

**Laptop lab (current default):** Control Plane already running at http://127.0.0.1:52100.

**Linux VPS (repository-complete, not official S7):**

- [ ] Ubuntu 24.04 node exists (**external**: vendor)
- [ ] `deploy/hosting-node/bootstrap.sh` completed
- [ ] SSH tunnel to 52100 works
- [ ] UFW: 22/80/443 open; 52100 closed to the world

### 2. Customer Account

- [ ] Control Plane → Customers → **New customer**
- [ ] Display name, slug, timezone, admin email
- [ ] Account exists with **zero** environments

### 3. Product Instance → PROD + DEV

- [ ] Customer workspace → **Add product instance** (Martial Arts and/or Sales)
- [ ] Status moves provisioning → ready
- [ ] Both environments **healthy** (container + `/api/health`)
- [ ] Record expected image, `releaseId`, `schemaVersion`
- [ ] If Failed: read `provision_error`, **Retry** (same volumes). Do not `down -v`

### 4. Initial administrator

- [ ] Capture initial username/password from the **one-time** API response or sidecar (gitignored)
- [ ] Sign in on PROD, complete forced password change
- [ ] Confirm Dashboard loads
- [ ] Create a second Admin if the contract says so
- [ ] Do not leave the development password in use

### 5. Product configuration (customer Admin or you on their behalf)

**Martial Arts**

- [ ] Intro schedule matches the academy
- [ ] Catalog offerings exist (**Convert is blocked if empty**)
- [ ] Programs/sources/lost reasons reviewed
- [ ] Optional: CSV import via Admin API (no staff import screen)
- [ ] `/trial` loads

**Sales** (if this instance is Sales)

- [ ] Letterhead
- [ ] Offers/prices
- [ ] Public intake left **off** unless they asked for `/inquire`

### 6. Hostname (PROD only)

Proven shape: `{slug}.nuxxion.com`. Acme is `https://acme.nuxxion.com`.

- [ ] Save public hostname in Control Plane
- [ ] DNS A record to the VPS public IP. No AAAA unless the node listens on IPv6.
- [ ] `EDGE_ROOT=/opt/sic/crm_marketing_saas/deploy/edge bash deploy/edge/issue-cert.sh {hostname} scottc@nuxxion.com`
- [ ] Save hostname again so nginx enables 443
- [ ] `https://{hostname}/api/health` from outside the VPS
- [ ] Login over HTTPS; cookie is `Secure`; a foreign `Origin` is rejected

### 7. Backup verification

- [ ] `/etc/sic/offhost.env` sets `SIC_OFFHOST_DEST` to a directory that is **not** on the VPS disk
- [ ] `/usr/local/sbin/sic-offhost-backup` exits 0 and `/var/lib/sic/backups/offhost-status.txt` starts with a timestamp and `OK`
- [ ] Control Plane no longer shows “no recorded off-host backup copy” for that PROD
- [ ] Do **not** restore that zip over PROD unless a second copy exists

Add Product still creates DEV. Stop DEV if the customer will not use it. A normal academy does not need it.

### 8. Handoff to the customer

- [ ] Staff URL
- [ ] Admin username (password already changed by them or given out of band once)
- [ ] Pointer to [Martial Arts user](6 - martial-arts-user-guide.md) / [Sales user](8 - sales-user-guide.md) and [Customer administrator](9 - customer-administrator-guide.md)
- [ ] How to reach SIC (commercial; not invented here)
- [ ] Confirm they understand Joined ≠ gym billing (Martial Arts) or Won ≠ auto-provision (Sales)

### 9. SIC hygiene

- [ ] Sidecar password file not sitting in chat logs
- [ ] Control Plane registry backup (`POST /api/control-plane/backup`)
- [ ] Dashboard Needs attention is clean

---

## After cancellation (offboarding)

See vault [import/export/offboarding](../crm_saas_vault/Customer-1-Import-Export-Runbook.md):

1. Export JSON + CSV (Martial Arts Admin APIs) / Sales export as agreed  
2. Control Plane Backup + off-host copy  
3. **Decommission** if you may still need the volumes  
4. **Archive & Delete** only when you intend to destroy that environment’s live sqlite/assets — Control Plane row stays, backup stays  
5. Never `compose down -v` on a shared host, never prune
