# Plan de Despliegue y DevOps - Malulos POS

## Estado: PENDIENTE

---

## Objetivos
- Dockerizar la aplicación (Frontend + Backend + DB).
- Configurar orquestación local y para producción.
- Automatizar el despliegue (CI/CD) con GitHub Actions.
- (Opcional) Preparar manifiestos de Kubernetes.

## Lista de Tareas

### Fase 1: Dockerización 🐳
- [x] Crear `Dockerfile` para el Backend (Node.js/Express). <!-- id: 1 -->
- [x] Crear `Dockerfile` para el Frontend (React + Nginx para producción). <!-- id: 2 -->
- [ ] Crear `docker-compose.yml` para levantar todo el stack localmente (App + DB). <!-- id: 3 -->
- [ ] Probar que el entorno Docker levanta correctamente en local. <!-- id: 4 -->

### Fase 2: Preparación para VPS y CI/CD 🚀
- [ ] Configurar variables de entorno para producción. <!-- id: 5 -->
- [ ] Crear script de "Healthcheck" para asegurar que los servicios están listos. <!-- id: 6 -->
- [ ] Crear flujo de GitHub Actions (`.github/workflows/deploy.yml`) para Build & Push. <!-- id: 7 -->
- [ ] Configurar paso de despliegue vía SSH en GitHub Actions. <!-- id: 8 -->

### Fase 3: Kubernetes (Opcional/Futuro) ☸️
- [ ] Crear manifiestos K8s: `backend-deployment.yaml`, `frontend-deployment.yaml`. <!-- id: 9 -->
- [ ] Crear servicios K8s: `backend-service.yaml`, `frontend-service.yaml`. <!-- id: 10 -->
- [ ] Documentar cómo aplicar esto en un cluster (ej. K3s). <!-- id: 11 -->

---

## Notas
- Se asumirá el uso de Docker Hub o GitHub Container Registry (GHCR) para las imágenes.
- Para el VPS, se requiere acceso SSH y Docker instalado.