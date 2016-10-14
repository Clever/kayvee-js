.PHONY: test build
TESTS=$(shell cd test && ls *.ts | sed s/\.ts$$//)
TS_FILES := $(shell find . -name "*.ts" -not -path "./node_modules/*" -not -path "./typings/*")

build: clean
	./node_modules/.bin/tsc --outDir build
	cp ./lib/router/schema_definitions.json ./build/lib/router/
	cp ./package.json ./build/

test: lint tests.json $(TESTS)

$(TESTS):
	_DEPLOY_ENV=testing DEBUG=us:progress NODE_ENV=test node_modules/mocha/bin/mocha --require ts-node/register --timeout 60000 test/$@.ts

clean:
	rm -rf build

lint:
	./node_modules/.bin/tslint $(TS_FILES)
	./node_modules/.bin/eslint $(TS_FILES)

tests.json:
	wget https://raw.githubusercontent.com/Clever/kayvee/master/tests.json -O test/tests.json
