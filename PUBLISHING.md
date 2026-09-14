# SDK Publishing

Both release workflows use GitHub-hosted runners and OIDC (`id-token: write`) so no long-lived npm or PyPI publish token is stored in GitHub.

## npm

Package: `whp-decision-integrity-client`

Workflow: `.github/workflows/publish-npm.yml`

Important: npm currently requires the package to already exist before a Trusted Publisher can be configured. The first npm release must therefore create the unscoped package using the npm account that will own it. After that first release, configure the package's Trusted Publisher with:

- GitHub owner: `wheelerhubbell`
- Repository: `DIP`
- Workflow filename: `publish-npm.yml`
- Allowed action: `npm publish`

The automated workflow uses Node 24, npm >=11.15, public access, and provenance.

## PyPI

Package: `whp-decision-integrity-client`

Workflow: `.github/workflows/publish-pypi.yml`

PyPI supports a pending Trusted Publisher for a project that does not exist yet. Configure the pending publisher with:

- PyPI project name: `whp-decision-integrity-client`
- GitHub owner: `wheelerhubbell`
- Repository: `DIP`
- Workflow filename: `publish-pypi.yml`
- Environment: `pypi`

The first successful workflow run creates the PyPI project and converts the pending publisher into a normal Trusted Publisher. A pending publisher does not reserve the project name until the first publish succeeds.

## Release gates

Do not publish from `main` until the canonical SDK branch has green contract and build checks. Do not run a funded service evaluation as part of package publishing. Package build and registry publication are independent of the service's $1 USDC paid evaluation path.
