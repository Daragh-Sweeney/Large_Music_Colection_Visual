FROM node:22-slim
ENV NODE_ENV production

RUN apt-get update && apt-get install -y python3-pip && rm -rf /var/lib/apt/lists/*
USER node
WORKDIR /home/node

COPY --chown=node:node ./requirements.txt .
RUN pip3 install --break-system-packages --user -r requirements.txt

COPY --chown=node:node ./package.json .
COPY --chown=node:node ./package-lock.json .
RUN npm install

COPY --chown=node:node . .
EXPOSE 3000
CMD [ "npm", "run", "start" ]
