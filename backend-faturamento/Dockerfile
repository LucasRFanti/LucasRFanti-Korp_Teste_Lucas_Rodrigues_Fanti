FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["PortalAdmin.csproj", "./"]
RUN dotnet restore "PortalAdmin.csproj"

COPY . .
RUN dotnet publish "PortalAdmin.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "PortalAdmin.dll"]
