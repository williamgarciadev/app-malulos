# Plan de Despliegue y DevOps - Malulos POS

## Estado: COMPLETADO Y OPTIMIZADO

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
- [x] **OPTIMIZACIÓN:** Cambiar a estrategia de "Build en GitHub, Pull en VPS" (GHCR) para evitar timeouts y sobrecarga del VPS. <!-- id: 15 -->

### Fase 3: Kubernetes (Opcional) ☸️
- [x] Crear carpeta `k8s`. <!-- id: 9 -->
- [x] Crear `k8s/00-namespace.yaml`. <!-- id: 10 -->
- [x] Crear `k8s/00-secrets-template.yaml`. <!-- id: 11 -->
- [x] Crear `k8s/01-postgres.yaml` (Deployment + Service + PVC). <!-- id: 12 -->
- [x] Crear `k8s/02-backend.yaml` (Deployment + Service). <!-- id: 13 -->
- [x] Crear `k8s/03-frontend.yaml` (Deployment + Service). <!-- id: 14 -->

---

## Instrucciones Finales

### 1. Configuración de Dominios en NPM
*   **Dominio Frontend:** `malulos.tudominio.com` -> Forward Host: `malulos-web`, Port: 80.
*   **Dominio API:** `api.malulos.tudominio.com` -> Forward Host: `malulos-api`, Port: 3000.
*   **Red:** Asegurar que NPM esté en la red `malulos_net`.

### 2. Actualización
Cada vez que hagas un push a `main` o `master`:
1. GitHub construirá las imágenes Docker.
2. GitHub subirá las imágenes a GHCR (GitHub Container Registry).
3. GitHub se conectará a tu VPS, descargará las nuevas versiones y reiniciará los contenedores en segundos.