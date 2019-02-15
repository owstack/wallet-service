FROM node:10

USER root
# Set up non root user
RUN useradd --user-group --create-home --shell /bin/false ows

# Setup environment variables
ENV NODE_ENV=production
ENV APP_NAME=wallet-service
ENV HOME_PATH=/home/ows
ENV APP_DIR=$HOME_PATH/$APP_NAME

# Set up folder
RUN mkdir -p $APP_DIR

# install modules
COPY . $APP_DIR
WORKDIR $APP_DIR
RUN npm install

RUN chown -R ows:ows $APP_DIR
USER ows

CMD ["echo", "run", "with", "docker-compose", "up"]
