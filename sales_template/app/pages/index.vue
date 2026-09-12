<script setup lang="ts">
const { loggedIn } = useUserSession()
await navigateTo(loggedIn.value ? '/dashboard' : '/login', { replace: true })
</script>
