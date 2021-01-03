# Set up OCaml

Set up an OCaml and opam environment and add to PATH.

## Status

**Highly unstable and incomplete.** If you use this, please use this entirely at
your own risk (at this **very** moment).

## Usage

### How to specify the version of the action

There is a point that is particularly easy to misunderstand. It's where you
specify the version of the action _itself_.

```yml
- name: Use OCaml ${{ matrix.ocaml-version }}
  uses: actions-ml/setup-ocaml@v1
  #                           ^^^
  with:
    ocaml-version: ${{ matrix.ocaml-version }}
```

We recommend that you include the version of the action. We adhere to
[semantic versioning](https://semver.org), it's safe to use the major version
(`v1`) in your workflow. If you use the master branch, this could break your
workflow when we publish a breaking update and increase the major version.

```yml
steps:
  # Reference the major version of a release (most recommended)
  - uses: actions-ml/setup-ocaml@v1
  # Reference a specific commit (most strict)
  - uses: actions-ml/setup-ocaml@abcdefg
  # Reference a semver version of a release (not recommended)
  - uses: actions-ml/setup-ocaml@v1.0.0
  # Reference a branch (most dangerous)
  - uses: actions-ml/setup-ocaml@master
```

### Example workflow

```yml
name: Main workflow

on:
  - pull_request
  - push

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        os:
          - macos-latest
          - ubuntu-latest
          - windows-latest
        ocaml-version:
          - 4.11.x
          - 4.10.x
          - 4.09.x
          - 4.08.x

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Use OCaml ${{ matrix.ocaml-version }}
        uses: actions-ml/setup-ocaml@v1
        with:
          ocaml-version: ${{ matrix.ocaml-version }}

      - run: opam install . --deps-only --with-doc --with-test

      - run: opam exec -- dune build

      - run: opam exec -- dune runtest
```

### What is the difference between opam dependencies and depext dependencies?

- opam dependencies: opam packages installed by `opam install`.
- depext dependencies: System packages installed by `apt install`,
  `yum install`, `brew install`, etc.

For example, the opam package called
[ocurl](https://opam.ocaml.org/packages/ocurl) requires `libcurl4-gnutls-dev` on
the Ubuntu VM, and depext handles the distribution-specific installation of opam
packages' external dependencies for such opam packages.

## Inputs

| Input             | Default               | Description                                                                                                                                                                                                                                                                  |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ocaml-version`   | `latest`              | The version of the OCaml compiler to initialise. The supported input types are latest version (`latest`), simple version (`4.11.1`), simple version with the wildcard character (`4.11.x`), and variant (`4.11.1+flambda`, `4.11.1+musl+static+flambda`, `4.11.1+mingw64c`). |
| `opam-repository` |                       | The URL of the repository to fetch packages from. The default is to select `https://github.com/ocaml/opam-repository.git` for Ubuntu and macOS and `https://github.com/fdopen/opam-repository-mingw.git#opam2` for Windows.                                                  |
| `github-token`    | `${{ github.token }}` | The token of GitHub to authenticate on behalf of the GitHub App installed on your repository. It's for internal use, such as version resolution, and is provided by default, so you do not need to set it yourself except in special cases.                                  |

## Action

The action does the following:

- **Ubuntu**, **macOS**: Installs the latest opam with sandboxing active. It
  checks our servers to see if the cache exists; if cache exists, it downloads
  and initialises; if cache does not exist or our servers are down, it attempts
  to build the compiler from the source.
- **Windows**: Installs Cygwin and the
  [fdopen fork](https://fdopen.github.io/opam-repository-mingw) with mingw64c.

The repository is initialised to the default one, and then the following plugins
are installed; all local packages are pinned, and then all system packages
required by opam packages are installed using depext.

- `opam-depext`

The `opam` binary is added to the `PATH` for subsequent actions, so that
executing `opam` commands will just work after that.

## Advanced Configurations

It is possible to feed different values to `opam-repository` depending on the
platform of the runner. The syntax of Github's workflows is flexible enough to
offer several methods to do this.

For example, using the strategy matrix:

```yml
strategy:
  fail-fast: false
  matrix:
    os:
      - macos-latest
      - ubuntu-latest
      - windows-latest
    include:
      - os: macos-latest
        opam-repository: https://github.com/ocaml/opam-repository.git
      - os: ubuntu-latest
        opam-repository: https://github.com/ocaml/opam-repository.git
      - os: windows-latest
        opam-repository: https://github.com/fdopen/opam-repository-mingw.git#opam2

runs-on: ${{ matrix.os }}

steps:
  - name: Use OCaml with repo ${{ matrix.opam-repository }}
    uses: actions-ml/setup-ocaml@v1
    with:
      opam-repository: ${{ matrix.opam-repository }}
```

Using a custom step to choose between the values:

```yml
steps:
  - id: repository
    shell: bash
    run: |
      if [ "$RUNNER_OS" == "Windows" ]; then
        echo "::set-output name=url::https://github.com/fdopen/opam-repository-mingw.git#opam2"
      elif [ "$RUNNER_OS" == "macOS" ]; then
        echo "::set-output name=url::https://github.com/custom/opam-repository.git#macOS"
      else
        echo "::set-output name=url::https://github.com/ocaml/opam-repository.git"
      fi

  - name: Use OCaml with repository ${{ steps.repository.url }}
    uses: actions-ml/setup-ocaml@v1
    with:
      opam-repository: ${{ steps.repository.url }}
```

Using several conditional setup steps:

```yml
steps:
  - name: Use OCaml on Windows
    uses: actions-ml/setup-ocaml@v1
    if: runner.os == 'Windows'
    with:
      ocaml-repository: https://github.com/fdopen/opam-repository-mingw.git#opam2

  - name: Use OCaml on Unix
    uses: actions-ml/setup-ocaml@v1
    if: runner.os != 'Windows'
    with:
      opam-repository: https://github.com/ocaml/opam-repository.git
```

## Roadmap

This action aims to provide an OS-neutral interface to `opam`, and so will not
add features that only work on one operating system. It will also track the
latest stable release of opam.

Discussions:
https://discuss.ocaml.org/t/github-actions-for-ocaml-opam-now-available/4745
