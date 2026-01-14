# Bitácora de Despliegue en VPS Contabo - Malulos POS

**Fecha:** 14 de Enero de 2026
**Estado:** ✅ Operativo (Web + API + DB) | ⚠️ Alerta (Bot Telegram pendiente por DNS)

---

## 1. Arquitectura Implementada

Se ha implementado una arquitectura de contenedores segura y automatizada:

*   **Orquestación:** Docker Compose (`docker-compose.prod.yml`).
*   **Proxy Inverso:** Nginx Proxy Manager (NPM) manejando SSL (Let's Encrypt) y dominios.
*   **Red:** `malulos_net` (Interna). La API y la DB **no exponen puertos** a internet, solo NPM tiene acceso público (80/443).
*   **CI/CD:** GitHub Actions con estrategia "Build & Push to GHCR".
    *   GitHub construye las imágenes.
    *   Las sube a GitHub Container Registry (Público).
    *   El VPS solo hace `pull` y reinicia (evitando sobrecarga de CPU).

## 2. Configuración Crítica

### Variables de Entorno (.env en VPS)
Ubicación: `~/app-malulos/.env`
```ini
POSTGRES_DB=malulos_pos
POSTGRES_USER=adminmalulos
POSTGRES_PASSWORD=Cucuta.***
# NOTA: La @ es CRÍTICA antes del host
DATABASE_URL=postgresql://adminmalulos:Cucuta.***@db:5432/malulos_pos
TELEGRAM_BOT_TOKEN=***
VITE_API_URL=https://api.malulos.wgsoft.com.co
# Deshabilita SSL para conexión interna Docker
DB_SSL=false
```

### Docker Compose
Se ha forzado el DNS para intentar mitigar problemas de red:
```yaml
  api:
    dns:
      - 8.8.8.8
      - 1.1.1.1
```

## 3. Problemas Resueltos

| Problema | Causa | Solución |
| :--- | :--- | :--- |
| **Timeout en Deploy** | El VPS (recursos limitados) tardaba >15min compilando React. | Se migró a **GHCR**: GitHub compila, VPS solo descarga. |
| **Error SSL DB** | `pg` intentaba usar SSL en conexión interna. | Se agregó lógica en `database.js` y variable `DB_SSL=false`. |
| **Crash de API** | `initTelegramBot` fallaba por DNS y tumbaba el servidor. | Se agregó `try/catch` para que el fallo sea solo un warning. |
| **PIN Incorrecto** | `VITE_API_URL` apuntaba a `localhost` en el build. | Se corrigió el secreto en GitHub a `https://api.malulos...` y se reconstruyó. |
| **Error URL DB** | Faltaba una `@` en la `DATABASE_URL` generada. | Se corrigió manualmente el `.env` en VPS y el script de deploy. |

## 4. Problema Pendiente: DNS Saliente (Telegram)

**Síntoma:**
El contenedor API no puede resolver dominios externos (`api.telegram.org`), arrojando:
`FetchError: ... reason: getaddrinfo EAI_AGAIN api.telegram.org`

**Diagnóstico:**
*   Se probó forzar DNS `8.8.8.8` en `daemon.json` y `docker-compose`.
*   Se probó reiniciar Docker y contenedores.
*   El comando `getent hosts api.telegram.org` dentro del contenedor devuelve vacío.
*   Conclusión: Bloqueo de tráfico UDP/DNS en la red de Contabo o firewall superior.

**Acción Tomada:**
Se envió correo a soporte Contabo solicitando revisión de bloqueo UDP puerto 53 saliente desde Docker.

**Contenido del correo enviado:**
> **Asunto:** Outbound DNS/UDP traffic blocked on VPS 167.86.114.157 - Docker containers affected
> 
> Hello Contabo Support Team,
> I am experiencing network connectivity issues with outbound DNS traffic on my VPS (IP: 167.86.114.157).
> Specifically, my Docker containers are unable to resolve external domain names (e.g., api.telegram.org, registry.npmjs.org), returning the error: getaddrinfo EAI_AGAIN.
> Diagnostic steps taken:
> 1. I have configured Docker to use Google DNS (8.8.8.8) in /etc/docker/daemon.json.
> 2. I have forced DNS in docker-compose.yml.
> 3. Direct connectivity to IPs works (e.g., ping 8.8.8.8 works from the host), but DNS resolution from within Docker containers fails consistently with timeouts.
> 4. My iptables OUTPUT policy is ACCEPT.
> It seems that UDP traffic on port 53 originating from the Docker network interface/subnet might be getting dropped or rate-limited.

**Próximos Pasos:**
1.  Esperar respuesta de Contabo.
2.  Si confirman desbloqueo, reiniciar Docker.
3.  Si no hay solución, evaluar usar modo `network_mode: host` (no recomendado) o `/etc/hosts` estático.

---

## 5. Comandos Útiles

**Ver logs de API:**
```bash
docker logs --tail 50 malulos-api
```

**Entrar a base de datos (Seed manual):**
```bash
docker exec -it malulos-api npm run seed
```

**Verificar usuarios y PINs:**
```bash
docker exec malulos-api node -e "import('./src/config/database.js').then(async ({pool}) => { const res = await pool.query('SELECT id,name,pin,isactive FROM users'); console.table(res.rows); process.exit(0); })"
```

**Despliegue Manual (si falla GitHub):**
```bash
cd ~/app-malulos
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
