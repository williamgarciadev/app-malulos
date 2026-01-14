# Guia Paso a Paso: Seguridad y Docker en el VPS

Este documento explica en lenguaje simple lo que se configuro y como repetirlo. Esta pensado para alguien sin experiencia.

## Indice
- [Antes de empezar](#antes-de-empezar)
- [SSH seguro (puerto 2222)](#ssh-seguro-puerto-2222)
- [Fail2ban contra fuerza bruta](#fail2ban-contra-fuerza-bruta)
- [Alertas por Telegram (Fail2ban)](#alertas-por-telegram-fail2ban)
- [Alertas por Email (Logwatch + Gmail)](#alertas-por-email-logwatch--gmail)
- [Hostname y DNS](#hostname-y-dns)
- [Docker (instalacion segura)](#docker-instalacion-segura)
- [Firewall para Docker (DOCKER-USER)](#firewall-para-docker-docker-user)
- [Nginx Proxy Manager (NPM)](#nginx-proxy-manager-npm)
- [Prueba con Apache httpd](#prueba-con-apache-httpd)
- [Solucion de errores comunes](#solucion-de-errores-comunes)
- [Consejos finales](#consejos-finales)
 - [Despliegue de Malulos POS](#despliegue-de-malulos-pos)

## Antes de empezar

1. Abre una segunda terminal SSH antes de cambiar puertos.
2. Ten a mano tu IP del VPS: 167.86.114.157.
3. Usa siempre sudo cuando el paso lo indique.

## SSH seguro (puerto 2222)

Objetivo: reducir ataques automaticos cambiando el puerto de SSH.

Paso 1: Verifica el puerto actual
- sudo ss -tlnp | grep ssh

Paso 2: Abre el puerto nuevo en UFW
- sudo ufw allow 2222/tcp
- sudo ufw enable
- sudo ufw status verbose

Paso 3: Conectate por el nuevo puerto
- ssh -p 2222 geoadmin@167.86.114.157

Nota: En Ubuntu 24.04 el puerto puede estar definido por systemd socket activation.

## Fail2ban contra fuerza bruta

Objetivo: bloquear IPs que intentan muchas veces entrar por SSH.

Paso 1: Edita el archivo principal
- sudo nano /etc/fail2ban/jail.local

Paso 2: En la seccion [sshd], usa estos valores
- enabled = true
- port = 2222
- logpath = %(sshd_log)s
- maxretry = 3
- findtime = 10m
- bantime = 24h

Paso 3: Reinicia el servicio
- sudo systemctl restart fail2ban

Paso 4: Verifica el estado
- sudo fail2ban-client status sshd

Pruebas manuales
- sudo fail2ban-client set sshd banip 1.2.3.4
- sudo fail2ban-client set sshd unbanip 1.2.3.4

## Alertas por Telegram (Fail2ban)

Objetivo: recibir un mensaje en Telegram cada vez que fail2ban banea o desbanea.

Paso 1: Verifica el script de envio
- /usr/local/bin/telegram-send

Paso 2: Crea la accion de fail2ban
- Archivo: /etc/fail2ban/action.d/telegram.conf
- Contenido recomendado:

[Definition]
actionban = printf 'Fail2ban: <name> BAN <ip> on vps.wgsoft.com.co\n<matches>' | /usr/local/bin/telegram-send
actionunban = printf 'Fail2ban: <name> UNBAN <ip> on vps.wgsoft.com.co' | /usr/local/bin/telegram-send

Paso 3: En /etc/fail2ban/jail.local, seccion [sshd]
- action = %(action_)s
           telegram

Paso 4: Reinicia fail2ban
- sudo systemctl restart fail2ban

Paso 5: Prueba
- sudo fail2ban-client set sshd banip 1.2.3.4

## Alertas por Email (Logwatch + Gmail)

Objetivo: recibir un resumen diario en Gmail.

Paso 1: Instala herramientas
- sudo apt update
- sudo apt install -y msmtp msmtp-mta logwatch

Paso 2: Configura msmtp para tu usuario (~/.msmtprc)

defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /home/geoadmin/.msmtp.log

account gmail
host smtp.gmail.com
port 587
from TU_GMAIL@gmail.com
user TU_GMAIL@gmail.com
password TU_APP_PASSWORD

account default : gmail

Paso 3: Protege el archivo
- chmod 600 ~/.msmtprc

Paso 4: Prueba envio
- echo "Prueba msmtp" | msmtp -a default TU_GMAIL@gmail.com

Paso 5: Logwatch a Gmail
- sudo nano /etc/cron.daily/00logwatch
- Deja esta linea:
  /usr/sbin/logwatch --output mail --mailto TU_GMAIL@gmail.com

Paso 6: Prueba manual
- sudo logwatch --output mail --mailto TU_GMAIL@gmail.com --detail high

## Hostname y DNS

Objetivo: que el servidor tenga un nombre correcto.

Paso 1: Configura el hostname
- sudo hostnamectl set-hostname vps.wgsoft.com.co

Paso 2: Actualiza /etc/hosts
- echo "127.0.1.1 vps.wgsoft.com.co vps" | sudo tee -a /etc/hosts

Paso 3: DNS en Hostinger
- A record: vps -> 167.86.114.157

Paso 4: PTR en Contabo (recomendado)
- 167.86.114.157 -> vps.wgsoft.com.co

## Docker (instalacion segura)

Objetivo: instalar Docker y mejorar logs y estabilidad.

Paso 1: Instala requisitos
- sudo apt update
- sudo apt install -y ca-certificates curl gnupg

Paso 2: Agrega la llave y repositorio
- sudo install -m 0755 -d /etc/apt/keyrings
- curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
- sudo chmod a+r /etc/apt/keyrings/docker.gpg
- echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo ${UBUNTU_CODENAME}) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

Paso 3: Instala Docker
- sudo apt update
- sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

Paso 4: Configuracion recomendada
- sudo nano /etc/docker/daemon.json
- Contenido:
  {
    "log-driver": "json-file",
    "log-opts": {"max-size": "50m", "max-file": "3"},
    "live-restore": true,
    "no-new-privileges": true
  }
- sudo systemctl restart docker

## Firewall para Docker (DOCKER-USER)

Objetivo: permitir solo puertos necesarios de contenedores.

Paso 1: Regla base (permite conexiones y luego bloquea todo)
- sudo iptables -F DOCKER-USER
- sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
- sudo iptables -I DOCKER-USER 2 -p tcp --dport 8080 -j ACCEPT
- sudo iptables -A DOCKER-USER -j DROP

Paso 2: Verifica el orden
- sudo iptables -S DOCKER-USER

Paso 3: Persistencia (opcional)
- sudo apt install -y iptables-persistent
- sudo netfilter-persistent save

## Nginx Proxy Manager (NPM)

Objetivo: usar dominios en vez de IP y crear HTTPS facil.

Paso 1: Abre puertos en UFW
- sudo apt install -y ufw
- sudo ufw allow 2222/tcp
- sudo ufw allow 80/tcp
- sudo ufw allow 81/tcp
- sudo ufw allow 443/tcp
- sudo ufw enable
- sudo ufw status verbose

Paso 2: Crea carpetas de datos
- sudo mkdir -p /opt/npm/data /opt/npm/letsencrypt

Paso 3: Levanta el contenedor
- sudo docker run -d \
  --name npm \
  -p 80:80 -p 81:81 -p 443:443 \
  -v /opt/npm/data:/data \
  -v /opt/npm/letsencrypt:/etc/letsencrypt \
  --restart unless-stopped \
  jc21/nginx-proxy-manager:latest

Paso 4: Verifica que esta corriendo
- sudo docker ps

Paso 5: Abre el panel
- http://167.86.114.157:81
- Usuario: admin@example.com
- Password: changeme

Paso 6: Si no carga el panel, revisa DOCKER-USER

En algunos casos, el panel no abre porque DOCKER-USER tiene un DROP antes de permitir 80/81/443.
Usa estas reglas en orden:
- sudo iptables -F DOCKER-USER
- sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
- sudo iptables -I DOCKER-USER 2 -p tcp --dport 80 -j ACCEPT
- sudo iptables -I DOCKER-USER 3 -p tcp --dport 81 -j ACCEPT
- sudo iptables -I DOCKER-USER 4 -p tcp --dport 443 -j ACCEPT
- sudo iptables -A DOCKER-USER -j DROP

## Prueba con Apache httpd

Objetivo: verificar que Docker publica puertos correctamente.

Paso 1: Contenedor de prueba
- sudo docker run --name webtest -d -p 8080:80 httpd:2.4

Paso 2: Prueba local
- curl http://localhost:8080

Paso 3: Prueba externa
- http://167.86.114.157:8080

Paso 4: Limpiar
- sudo docker stop webtest
- sudo docker rm webtest
- sudo ufw delete allow 8080/tcp

## Solucion de errores comunes

Problema 1: No abre el panel de NPM en http://IP:81
1. Verifica que el contenedor esta corriendo:
   - sudo docker ps
2. Verifica que escucha en 80/81/443:
   - sudo ss -tlnp | grep -E "(80|81|443)"
3. Verifica UFW:
   - sudo ufw status verbose
4. Verifica DOCKER-USER (debe permitir 80/81/443 antes del DROP):
   - sudo iptables -S DOCKER-USER

Problema 2: El navegador se queda cargando con timeout
1. Verifica DOCKER-USER:
   - sudo iptables -S DOCKER-USER
2. Asegura reglas correctas:
   - sudo iptables -F DOCKER-USER
   - sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
   - sudo iptables -I DOCKER-USER 2 -p tcp --dport 80 -j ACCEPT
   - sudo iptables -I DOCKER-USER 3 -p tcp --dport 81 -j ACCEPT
   - sudo iptables -I DOCKER-USER 4 -p tcp --dport 443 -j ACCEPT
   - sudo iptables -A DOCKER-USER -j DROP

Problema 3: El contenedor no responde desde fuera
1. Prueba local:
   - curl http://localhost:PUERTO
2. Abre el puerto en UFW:
   - sudo ufw allow PUERTO/tcp
3. Verifica que docker-proxy escucha:
   - sudo ss -tlnp | grep PUERTO

Problema 4: SSL no se emite en NPM
1. Verifica DNS apunta a la IP correcta.
2. Asegura puertos 80 y 443 abiertos.
3. Verifica logs de NPM:
   - sudo docker logs npm --tail 100

## Consejos finales
- Usa llaves SSH y desactiva PasswordAuthentication.
- Mantiene el sistema actualizado.
- Haz backups automaticos.

## Despliegue de Malulos POS

Ver `docs/docker/README.md` para pasos completos con Docker + NPM.
