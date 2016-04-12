.PHONY: test test-cov build
TESTS=$(shell cd test && ls *.ts | sed s/\.ts$$//)
LIBS=$(shell find . -regex "^./lib\/.*\.coffee\$$" | sed s/\.coffee$$/\.js/ | sed s/lib/lib-js/)

build: $(LIBS)

lib-js/%.js : lib/%.coffee
	node_modules/coffee-script/bin/coffee --bare -c -o $(@D) $(patsubst lib-js/%,lib/%,$(patsubst %.js,%.coffee,$@))

test: tests.json $(TESTS)

$(TESTS): build
	DEBUG=us:progress NODE_ENV=test node_modules/mocha/bin/mocha --require ts-node/register --timeout 60000 --compilers coffee:coffee-script test/$@.ts

test-cov: build
	# jscoverage only accepts directory arguments so have to rebuild everything
	rm -rf lib-js-cov
	jscoverage lib-js lib-js-cov
	NODE_ENV=test TEST_COV=1 node_modules/mocha/bin/mocha --compilers coffee:coffee-script -R html-cov test/*.coffee | tee coverage.html
	open coverage.html

publish: clean build
	$(eval VERSION := $(shell grep version package.json | sed -ne 's/^[ ]*"version":[ ]*"\([0-9\.]*\)",/\1/p';))
	@echo \'$(VERSION)\'
	$(eval REPLY := $(shell read -p "Publish and tag as $(VERSION)? " -n 1 -r; echo $$REPLY))
	@echo \'$(REPLY)\'
	@if [[ $(REPLY) =~ ^[Yy]$$ ]]; then \
	    npm publish; \
	    git tag -a v$(VERSION) -m "version $(VERSION)"; \
	    git push --tags; \
	fi

clean:
	rm -rf lib-js lib-js-cov

tests.json:
	wget https://raw.githubusercontent.com/Clever/kayvee/master/tests.json -O test/tests.json
