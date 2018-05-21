VERSION=$(shell git describe --tags)

export GO15VENDOREXPERIMENT=1

NAME=cago
DESCRIPTION="Cagophilist - Manager of AWS profiles"

GO_VERSION=$(shell go version)

# Get the git commit
SHA=$(shell git rev-parse --short HEAD)
BUILD_COUNT=$(shell git rev-list --count HEAD)

BUILD_TAG="${BUILD_COUNT}.${SHA}"

UNAME := $(shell uname -s)

BUILD_DIR=build

CCOS=windows darwin linux
CCARCH=amd64
GOX_OUTPUT="$(BUILD_DIR)/{{.OS}}-{{.Arch}}/$(NAME)"

.PHONY: default
default: banner lint

.PHONY: banner
banner:
	@echo "Working dir:    $(shell pwd)"
	@echo "Go version:     ${GO_VERSION}"
	@echo "Go path:        ${GOPATH}"
	@echo "Binary name:    $(NAME)"
	@echo "Binary version: $(VERSION)"

.PHONY: update-vendor
update-vendor:
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
lint: clean
	@printf "\n==> Installing Go meta-linter\n"
	go get -u gopkg.in/alecthomas/gometalinter.v2
	@printf "\n==> Installing linters\n"
	gometalinter.v2 --install
	@printf "\n==> Running linters\n"
	gometalinter.v2 --vendor ./...

.PHONY: gox
gox: clean banner
	@printf "\n==> Using Gox to cross-compile $(NAME)\n"
	go get github.com/mitchellh/gox
	@mkdir -p $(BUILD_DIR)
	@cd $(BUILD_DIR)
	@gox -ldflags="-X github.com/electric-it/cagophilist/cmd.Version=${VERSION}" \
	     -os="$(CCOS)" \
			 -arch="$(CCARCH)" \
			 -output="$(GOX_OUTPUT)"

.PHONY: package
package: SHELL:=/bin/bash
package: gox
	@printf "\n==> Creating packages\n"
	@set -exv
	@for os in $(CCOS);                                          				      \
	 do                                                                       \
		  for arch in $(CCARCH);                                                \
		  do                                                                    \
				package_dir=$(BUILD_DIR)/$$os-$$arch/;                              \
				echo Working on: $$package_dir;                                     \
		    if [ "$$os" == "windows" ]; then                                    \
		      filename=cago-$$os-$$arch-$(VERSION).zip;                         \
		      echo Creating: $(BUILD_DIR)/$$filename;                           \
		      zip $(BUILD_DIR)/$$filename $$package_dir/* scripts/cago_win.bat; \
		    else                                                                \
		      filename=cago-$$os-$$arch-$(VERSION).tar.gz;                      \
		      echo Creating: $(BUILD_DIR)/$$filename;                           \
		      tar -czf $(BUILD_DIR)/$$filename $$package_dir/* scripts/cago.sh; \
		    fi;                                                                 \
		  done                                                                  \
	 done
	@printf "\n==> Done packaging\n"

.PHONY: clean
clean:
	@printf "\n==> Cleaning\n"
	rm -rf $(BUILD_DIR)
