# SDK Publishing

Both release workflows use GitHub-hosted runners and OIDC (`id-token: write`) so no long-lived npm or PyPI publish token is stored in GitHub.

## npm

Package: `whp-decision-integrity-client`

Workflow: `.github/workflows/publish-npm.yml`

Status: initial `0.1.0` release completed and npm Trusted Publishing is configured for:

- GitHub owner: `wheelerhubbell`
- Repository: `DIP`
- Workflow filename: `publish-npm.yml`
- Allowed action: `npm publish`
- Environment: none

Future npm releases publish through OIDC. The temporary bootstrap npm token has been revoked and the workflow no longer references `NPM_TOKEN`.

The automated workflow uses Node 24, npm >=11.15, public access, and provenance.

## PyPI

Package: `whp-decision-integrity-client`

Workflow: `.github/workflows/publish-pypi.yml`

Status: initial `0.1.0` release completed through PyPI Trusted Publishing using:

- GitHub owner: `wheelerhubbell`
- Repository: `DIP`
- Workflow filename: `publish-pypi.yml`
- Environment: `pypi`

Future PyPI releases publish through OIDC without a long-lived registry token.

## Release gates

Do not run a funded service evaluation as part of package publishing. Package build and registry publication are independent of the service's $1 USDC paid evaluation path.
