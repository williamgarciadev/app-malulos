# Plan de Despliegue y DevOps - Malulos POS

## Estado: COMPLETADO

---

## Objetivos
- Automatizar despliegue en VPS con Docker Compose.
- Configurar CI/CD en GitHub Actions para despliegue continuo al hacer push.
- Generar manifiestos de Kubernetes (opcional/educativo).

## Lista de Tareas

### Fase 1: Dockerización y Pruebas Locales 🐳
- [x] Crear `Dockerfile` para el Backend (Node.js/Express). <!-- id: 1 -->
- [x] Crear `Dockerfile` para el Frontend (React + Nginx para producción). <!-- id: 2 -->
- [x] Revisar `docker-compose.prod.yml` existente. <!-- id: 3 -->
- [x] Validar configuración de Nginx (`nginx.conf`) para manejo de rutas en React (SPA). <!-- id: 4 -->
- [x] Validar scripts de arranque en backend (`package.json`). <!-- id: 5 -->

### Fase 2: Configuración CI/CD (GitHub Actions) 🚀
- [x] Crear directorio `.github/workflows`. <!-- id: 6 -->
- [x] Crear workflow `.github/workflows/deploy.yml`. <!-- id: 7 -->
    - Definir jobs de copy (SCP) y ejecución remota (SSH).
    - Configurar inyección de variables de entorno (creación de .env en remoto).
- [x] Ajustar puertos para convivir con Nginx Proxy Manager (Web: 3001, API: 3000). <!-- id: 8 -->

### Fase 3: Kubernetes (Opcional) ☸️
- [x] Crear carpeta `k8s`. <!-- id: 9 -->
- [x] Crear `k8s/00-namespace.yaml`. <!-- id: 10 -->
- [x] Crear `k8s/00-secrets-template.yaml`. <!-- id: 11 -->
- [x] Crear `k8s/01-postgres.yaml` (Deployment + Service + PVC). <!-- id: 12 -->
- [x] Crear `k8s/02-backend.yaml` (Deployment + Service). <!-- id: 13 -->
- [x] Crear `k8s/03-frontend.yaml` (Deployment + Service). <!-- id: 14 -->

---

## Instrucciones Finales para el Usuario

### 1. Configuración de Dominios en NPM
Entra a tu Nginx Proxy Manager (puerto 81 normalmente) y configura:

*   **Dominio:** `malulos.tudominio.com` (o el que uses)
    *   **Forward Host:** `167.86.114.157` (Tu IP VPS)
    *   **Forward Port:** `3001`
    *   **Websockets Support:** Activado (Recomendado)
    *   **SSL:** Request a new SSL Certificate (Let's Encrypt) -> Force SSL.

*   **Dominio:** `api.malulos.tudominio.com`
    *   **Forward Host:** `167.86.114.157` (Tu IP VPS)
    *   **Forward Port:** `3000`
    *   **SSL:** Request a new SSL Certificate -> Force SSL.

### 2. Variables en GitHub
Asegúrate de que el secreto `VITE_API_URL` en GitHub sea `https://api.malulos.tudominio.com` (con HTTPS, ya que NPM manejará el certificado).
