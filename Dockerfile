# Build stage
FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
# La variabile d'ambiente VITE_API_URL può essere passata durante il build
# ARG VITE_API_URL
# ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Serve stage usando nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configurazione base per single page application (redirect a index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
