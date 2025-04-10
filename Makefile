#============================================================= CI TASKS ========

ci-lint:
	npm i
	npm run prettier
	npm run check
	npm run lint


test: ci-lint
	npm run test

ci-build:
	npm i
	npm run build
