VERSION=$(shell git describe --tags)

export GO15VENDOREXPERIMENT=1

NAME=cago
DESCRIPTION="Cagophilist - Manager of AWS profiles"

CCOS=windows darwin linux
CCARCH=amd64
CCOUTPUT="pkg/{{.OS}}-{{.Arch}}/$(NAME)"

GO_VERSION=$(shell go version)

# Get the git commit
SHA=$(shell git rev-parse --short HEAD)
BUILD_COUNT=$(shell git rev-list --count HEAD)

BUILD_TAG="${BUILD_COUNT}.${SHA}"

UNAME := $(shell uname -s)

.PHONY: default
default: banner lint

.PHONY: banner
banner:
	@echo "Working dir:    $(shell pwd)"
	@echo "Go version:     ${GO_VERSION}"
	@echo "Go path:        ${GOPATH}"
	@echo "Binary name:    $(NAME)"
	@echo "Binary version: $(VERSION)"

.PHONY: vendor
vendor:
	curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
	@printf "\n==> Installed dep\n"
	dep version
	@printf "\n==> Running 'dep ensure'\n"
	dep ensure

.PHONY: docs
docs:
	@printf "\n==> Updating README TOC\n"
	npm install -g doctoc
	doctoc README.md --maxlevel 1

.PHONY: lint
lint: clean vendor
	@printf "\n==> Installing Go meta-linter\n"
	go get -u gopkg.in/alecthomas/gometalinter.v2
	@printf "\n==> Installing linters\n"
	gometalinter.v2 --install
	@printf "\n==> Running linters\n"
	gometalinter.v2 --vendor ./...

.PHONY: gox
gox: vendor
	@printf "\n==> Using Gox to cross-compile $(NAME)\n"
	go get github.com/mitchellh/gox
	@mkdir -p $(BUILD_DIR)
	@cd $(BUILD_DIR)
	@gox -ldflags="-X github.com/electric-it/cagophilist/cmd.Version=${VERSION}" \
	     -os="$(CCOS)" \
			 -arch="$(CCARCH)" \
			 -output="$(CCOUTPUT)"

.PHONY: package
package: SHELL:=/bin/bash
package: gox
	@printf "\n==> Creating distributable packages\n"
	@set -exv
	@mkdir -p release/
	@for os in $(CCOS);                                          				\
	 do                                                                 \
		  for arch in $(CCARCH);                                          \
		  do                                                              \
		    cd "pkg/$$os-$$arch/" || exit;                                \
		    if [ "$$os" == "windows" ]; then                              \
					cp ../../scripts/cago_win.bat .;                            \
		      filename=cago-$$os-$$arch-$(VERSION).zip;                   \
		      echo Creating: release/$$filename;                          \
		      zip ../../release/$$filename cago* > /dev/null 2>&1;        \
		    else                                                          \
					cp ../../scripts/cago.sh .;                                 \
		      filename=cago-$$os-$$arch-$(VERSION).tar.gz;                \
		      echo Creating: release/$$filename;                          \
		      tar -zcvf ../../release/$$filename cago* > /dev/null 2>&1;  \
		    fi;                                                           \
		    cd ../../ || exit;                                            \
		  done                                                            \
	 done
	@printf "\n==> Done Cross Compiling $(NAME)\n"

.PHONY: clean
clean:
	@printf "\n==> Cleaning\n"
	rm -rf release/
	rm -rf bin/
	rm -rf pkg/
