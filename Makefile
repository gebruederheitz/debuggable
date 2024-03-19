# Watch sources and host demo content on http://localhost:8080
dev:
	asdf exec npm i && asdf exec npm run watch

build:
	asdf exec npm i && asdf exec npm run build

lint:
	asdf exec npm i && asdf exec npm run lint

release:
	asdf exec npm run release

#============================================================= CI TASKS ========

ci-lint:
	npm i && npm run lint


test: ci-lint

ci-build:
	npm i && npm run build
