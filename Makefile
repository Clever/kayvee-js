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

benchmarks: build benchmark-data
	node benchmarks/routing.js

clean:
	rm -rf build

clean-data:
	rm ./benchmarks/data/*.json ./benchmarks/data/*.yml

benchmark-data:
	@# Only download if the files don't exist
	@[ -f ./benchmarks/data/corpus-basic.json ] || curl https://raw.githubusercontent.com/Clever/kayvee/master/data/corpus-basic.json > ./benchmarks/data/corpus-basic.json
	@[ -f ./benchmarks/data/corpus-pathological.json ] || curl https://raw.githubusercontent.com/Clever/kayvee/master/data/corpus-pathological.json > ./benchmarks/data/corpus-pathological.json
	@[ -f ./benchmarks/data/corpus-realistic.json ] || curl https://raw.githubusercontent.com/Clever/kayvee/master/data/corpus-realistic.json > ./benchmarks/data/corpus-realistic.json
	@[ -f ./benchmarks/data/kvconfig-basic.yml ] || curl https://raw.githubusercontent.com/Clever/kayvee/master/data/kvconfig-basic.yml > ./benchmarks/data/kvconfig-basic.yml
	@[ -f ./benchmarks/data/kvconfig-pathological.yml ] || curl https://raw.githubusercontent.com/Clever/kayvee/master/data/kvconfig-pathological.yml > ./benchmarks/data/kvconfig-pathological.yml
	@[ -f ./benchmarks/data/kvconfig-realistic.yml ] || curl https://raw.githubusercontent.com/Clever/kayvee/master/data/kvconfig-realistic.yml > ./benchmarks/data/kvconfig-realistic.yml

lint:
	./node_modules/.bin/tslint $(TS_FILES)
	./node_modules/.bin/eslint $(TS_FILES)

tests.json:
	wget https://raw.githubusercontent.com/Clever/kayvee/master/tests.json -O test/tests.json
