FROM directus/directus:9

COPY ./dist/index.js /directus/extensions/endpoints/snapshot/index.js
