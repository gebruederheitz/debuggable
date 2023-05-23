# Watch sources and host demo content on http://localhost:8080
dev:
	. $$NVM_DIR/nvm.sh && nvm use && \
	npm i && npm run watch

build:
	. $$NVM_DIR/nvm.sh && nvm use && \
	npm i && npm run build

lint:
	. $$NVM_DIR/nvm.sh && nvm use && \
	npm i && npm run lint

release:
	. $$NVM_DIR/nvm.sh && nvm use && \
	npm run release

#============================================================= CI TASKS ========

ci-lint:
	npm i && npm run lint


test: ci-lint

ci-build:
	npm i && npm run build
