#!/usr/bin/env bash
# Azure Cloud Shell, Bash. NO ejecutado contra una suscripción en esta revisión.
set +x
set -euo pipefail
cd "$(dirname "$0")/.."
: "${SUBSCRIPTION_ID:?Falta SUBSCRIPTION_ID real}"
: "${RESOURCE_GROUP:?Falta RESOURCE_GROUP dedicado al proyecto}"
: "${LOCATION:?Falta LOCATION disponible en la suscripción}"
: "${STORAGE_ACCOUNT:?Falta STORAGE_ACCOUNT único, 3-24 letras minúsculas/números}"
: "${ACR_NAME:?Falta ACR_NAME único, letras/números}"
APP_NAME=${APP_NAME:-asistente-negocios-m2}
ENV_NAME=${ENV_NAME:-entorno-negocios-m2}
IDENTITY_NAME=${IDENTITY_NAME:-identidad-negocios-m2}
CONTAINER_NAME=${CONTAINER_NAME:-comprobantes}
IMAGE_TAG=${IMAGE_TAG:-m2-$(date -u +%Y%m%d%H%M%S)}
STAGE=${1:-}
[[ "$STAGE" = preparar || "$STAGE" = publicar ]] || { echo 'Uso: bash scripts/desplegar-azure.sh preparar|publicar'; exit 2; }
[[ "$STORAGE_ACCOUNT" =~ ^[a-z0-9]{3,24}$ ]] || { echo 'Nombre Storage inválido'; exit 2; }
[[ "$ACR_NAME" =~ ^[a-zA-Z0-9]{5,50}$ ]] || { echo 'Nombre ACR inválido'; exit 2; }
[[ "$(az cloud show --query name -o tsv)" = AzureCloud ]] || { echo 'Este script está preparado para Azure público'; exit 2; }
az account set --subscription "$SUBSCRIPTION_ID"
[[ "$(az account show --query state -o tsv)" = Enabled ]] || { echo 'Suscripción no habilitada'; exit 2; }
az account show --query '{suscripcion:name,id:id,estado:state}' -o table
# Requiere Microsoft.App, Microsoft.Storage, Microsoft.ContainerRegistry y
# Microsoft.ManagedIdentity registrados. La guía incluye su comprobación.
if [[ "$STAGE" = preparar ]]; then
  # Los nombres deben pertenecer a ESTE proyecto. No reutilizar recursos ajenos.
  az group create -n "$RESOURCE_GROUP" -l "$LOCATION" --tags proyecto=asistente-negocios curso=cloud-m2 -o none
  az storage account create -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" -l "$LOCATION" \
    --sku Standard_LRS --kind StorageV2 --https-only true --min-tls-version TLS1_2 \
    --allow-blob-public-access false --allow-shared-key-access false -o none
  az storage container-rm create -g "$RESOURCE_GROUP" --storage-account "$STORAGE_ACCOUNT" \
    --name "$CONTAINER_NAME" --public-access off -o none
  az acr create -g "$RESOURCE_GROUP" -n "$ACR_NAME" -l "$LOCATION" --sku Basic --admin-enabled false -o none
  az identity create -g "$RESOURCE_GROUP" -n "$IDENTITY_NAME" -l "$LOCATION" -o none
  az containerapp env create -g "$RESOURCE_GROUP" -n "$ENV_NAME" -l "$LOCATION" \
    --logs-destination none -o none
  PRINCIPAL=$(az identity show -g "$RESOURCE_GROUP" -n "$IDENTITY_NAME" --query principalId -o tsv)
  STORAGE_ID=$(az storage account show -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" --query id -o tsv)
  ACR_ID=$(az acr show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query id -o tsv)
  DATA_SCOPE="$STORAGE_ID/blobServices/default/containers/$CONTAINER_NAME"
  # Permisos de datos solo al contenedor; AcrPull solo al registro del proyecto.
  az role assignment create --assignee-object-id "$PRINCIPAL" --assignee-principal-type ServicePrincipal \
    --role 'Storage Blob Data Contributor' --scope "$DATA_SCOPE" -o none
  az role assignment create --assignee-object-id "$PRINCIPAL" --assignee-principal-type ServicePrincipal \
    --role AcrPull --scope "$ACR_ID" -o none
  echo 'Preparación terminada. Las asignaciones RBAC pueden tardar en propagarse.'
  echo 'Revisa los recursos y luego ejecuta la etapa publicar.'
  exit 0
fi
IDENTITY_ID=$(az identity show -g "$RESOURCE_GROUP" -n "$IDENTITY_NAME" --query id -o tsv)
CLIENT_ID=$(az identity show -g "$RESOURCE_GROUP" -n "$IDENTITY_NAME" --query clientId -o tsv)
REGISTRY=$(az acr show -g "$RESOURCE_GROUP" -n "$ACR_NAME" --query loginServer -o tsv)
# El contexto excluye .env, cachés y node_modules mediante .dockerignore.
az acr build -r "$ACR_NAME" -t "asistente-negocios:$IMAGE_TAG" . -o none
# Token ingresado por la titular; no se genera ni imprime en los registros.
read -r -s -p 'Token de demo (mínimo 32 caracteres, guardar en canal privado): ' DEMO_TOKEN
printf '\n'
[[ ${#DEMO_TOKEN} -ge 32 && "$DEMO_TOKEN" =~ ^[A-Za-z0-9_-]+$ ]] || { echo 'Usa 32+ letras/números, guion o guion bajo'; exit 2; }
trap 'unset DEMO_TOKEN' EXIT
if az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" -o none 2>/dev/null; then
  az containerapp secret set -g "$RESOURCE_GROUP" -n "$APP_NAME" --secrets "demo-token=$DEMO_TOKEN" -o none
  az containerapp update -g "$RESOURCE_GROUP" -n "$APP_NAME" \
    --image "$REGISTRY/asistente-negocios:$IMAGE_TAG" --min-replicas 0 --max-replicas 2 \
    --cpu 0.25 --memory 0.5Gi --set-env-vars "AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT" \
    "AZURE_STORAGE_CONTAINER=$CONTAINER_NAME" "AZURE_CLIENT_ID=$CLIENT_ID" 'DEMO_TOKEN=secretref:demo-token' -o none
else
  az containerapp create -g "$RESOURCE_GROUP" -n "$APP_NAME" --environment "$ENV_NAME" \
    --image "$REGISTRY/asistente-negocios:$IMAGE_TAG" --registry-server "$REGISTRY" \
    --user-assigned "$IDENTITY_ID" --registry-identity "$IDENTITY_ID" \
    --ingress external --target-port 8080 --transport auto \
    --min-replicas 0 --max-replicas 2 --cpu 0.25 --memory 0.5Gi \
    --secrets "demo-token=$DEMO_TOKEN" --env-vars "AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT" \
    "AZURE_STORAGE_CONTAINER=$CONTAINER_NAME" "AZURE_CLIENT_ID=$CLIENT_ID" 'DEMO_TOKEN=secretref:demo-token' -o none
fi
az containerapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --query '{url:properties.configuration.ingress.fqdn,revision:properties.latestReadyRevisionName,estado:properties.provisioningState}' -o json
