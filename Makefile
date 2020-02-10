.PHONY: test

jpeg-turbo.wasm: Dockerfile jconfig.h jconfigint.h
	docker build .
	sh -c 'docker run --rm -it $$(docker build -q .) | base64 -D > jpeg-turbo.wasm'

test: jpeg-turbo.wasm
	@node_modules/.bin/mocha
	npm run lint
	npm run docs

bench: opt
	node benchmark.js

opt: jpeg-turbo.wasm
	wasm-opt jpeg-turbo.wasm -o jpeg-turbo_opt.wasm \
    -O3 -mvp \
    --inlining-optimizing \
    --post-emscripten --precompute-propagate --simplify-globals-optimizing \
    --no-exit-runtime -lmu -iit
