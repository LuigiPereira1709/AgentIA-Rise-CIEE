.PHONY: setup provision dev start stop clean

# Auto-detect local or global dotnet and pwsh paths
DOTNET := $(shell if [ -f $(HOME)/.dotnet/dotnet ]; then echo $(HOME)/.dotnet/dotnet; else echo dotnet; fi)
PWSH := $(shell if [ -f $(HOME)/.dotnet/tools/pwsh ]; then echo $(HOME)/.dotnet/tools/pwsh; else echo pwsh; fi)

# Default target
start: dev

# Install dependencies and restore project
setup:
	@echo "=== Setting up project dependencies ==="
	npm install --prefix frontend
	$(DOTNET) restore backend/WebApp.Api/WebApp.Api.csproj /p:AllowMissingPrunePackageData=true
	@echo "=== Setup completed ==="

# Provision Azure resources (Entra ID registration, etc.)
provision:
	@echo "=== Provisioning Azure Resources ==="
	@export PATH="$$PATH:$(HOME)/.dotnet/tools" && azd provision

# Start frontend and backend development servers in parallel
dev: stop
	@echo "=== Starting Dev Servers (Ctrl+C to stop both) ==="
	@export PATH="$$PATH:$(HOME)/.dotnet/tools" && \
	trap 'kill 0' INT; \
	(cd backend/WebApp.Api && $(DOTNET) run --launch-profile http /p:AllowMissingPrunePackageData=true) & \
	(cd frontend && npm run dev) & \
	wait

# Stop any processes running on the backend (8080) and frontend (5173) ports
stop:
	@echo "=== Stopping any running servers on ports 8080 and 5173 ==="
	@-kill -9 $$(lsof -t -i:8080) 2>/dev/null || true
	@-kill -9 $$(lsof -t -i:5173) 2>/dev/null || true

# Clean up builds and node_modules
clean: stop
	@echo "=== Cleaning build artifacts ==="
	rm -rf frontend/dist frontend/node_modules
	rm -rf backend/WebApp.Api/bin backend/WebApp.Api/obj
	rm -rf backend/WebApp.ServiceDefaults/bin backend/WebApp.ServiceDefaults/obj
