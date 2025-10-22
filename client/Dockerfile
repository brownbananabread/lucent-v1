FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install

# Accept build arguments
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_SERVER_URL

# Set them as environment variables for the build
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]