#!/bin/bash
# Script para automatizar a instalação de dependências e deploy em uma VM AWS Linux (Amazon Linux 2023 ou Ubuntu)

set -e

echo "=== Iniciando a instalação de dependências para o Deploy ==="

# 1. Detectar o sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

echo "Sistema operacional detectado: $OS"

# 2. Atualizar pacotes e instalar Docker / Git
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    echo "Instalando dependências via DNF/YUM (Amazon Linux / RedHat)..."
    sudo dnf update -y || sudo yum update -y
    sudo dnf install -y docker git || sudo yum install -y docker git
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "Instalando dependências via APT (Ubuntu/Debian)..."
    sudo apt-get update -y
    sudo apt-get install -y docker.io git
else
    echo "SO não suportado automaticamente por este script. Por favor, instale o Docker e o Git manualmente."
    exit 1
fi

# 3. Iniciar e habilitar o serviço do Docker
echo "Iniciando e habilitando o serviço do Docker..."
sudo systemctl start docker
sudo systemctl enable docker

# 4. Adicionar o usuário atual ao grupo docker para não precisar usar 'sudo' em todos os comandos
echo "Configurando permissões do Docker para o usuário atual..."
sudo usermod -aG docker $USER

echo "=== Instalação de dependências concluída! ==="
echo ""
echo "Importante: Para aplicar as permissões do Docker ao seu terminal atual, execute o comando:"
echo "  newgrp docker"
echo ""
echo "Passos para rodar a aplicação:"
echo "1. Clone o repositório se ainda não o fez:"
echo "   git clone <URL_DO_REPOSITORIO>"
echo "   cd foundry-agent-webapp"
echo ""
echo "2. Compile a imagem Docker única (que constrói o Frontend Vite e o Backend .NET 10):"
echo "   docker build \\"
echo "     --build-arg ENTRA_SPA_CLIENT_ID=\"seu_client_id_frontend\" \\"
echo "     --build-arg ENTRA_TENANT_ID=\"seu_tenant_id\" \\"
echo "     --build-arg ENTRA_BACKEND_CLIENT_ID=\"seu_client_id_backend\" \\"
echo "     -t foundry-agent-webapp \\"
echo "     -f deployment/docker/frontend.Dockerfile ."
echo ""
echo "3. Execute o container mapeando a porta 80 do host para a porta 8080 do container:"
echo "   docker run -d -p 80:8080 \\"
echo "     --name agent-webapp \\"
echo "     -e AzureAd__TenantId=\"seu_tenant_id\" \\"
echo "     -e AzureAd__ClientId=\"seu_client_id_frontend\" \\"
echo "     -e AI_AGENT_ENDPOINT=\"seu_agent_endpoint\" \\"
echo "     -e AI_AGENT_ID=\"seu_agent_id\" \\"
echo "     -e AI_SUPPORT_AGENT_ID=\"seu_support_agent_id\" \\"
echo "     --restart always \\"
echo "     foundry-agent-webapp"
echo ""
