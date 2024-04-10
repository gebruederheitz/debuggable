# Watch sources and host demo content on http://localhost:8080
dev:
	asdf exec npm i
	asdf exec npm run watch

build:
	asdf exec npm i
	asdf exec npm run build

lint:
	asdf exec npm i
	asdf exec npm run lint
	asdf exec npm run test

release:
	asdf exec npm run release

#============================================================= CI TASKS ========

ci-lint:
	npm i
	npm run lint


test: ci-lint
	npm run test

ci-build:
	npm i
	npm run build
