# Changelog

## [0.2.0](https://github.com/ahmedMahfouz5/ecommerce-platform/compare/ecommerce-platform-v0.1.0...ecommerce-platform-v0.2.0) (2026-10-12)


### Features

* add .dockerignore for backend to exclude sensitive files and directories ([4a115db](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/4a115db56bb21d43bcbb9e02494439dd75a99751))
* add .dockerignore for frontend to exclude unnecessary files and directories ([7e34c59](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/7e34c59ca22b10fc0b230f13c0cbd607747ec1d9))
* add docker-compose.prod.yml for production environment setup ([b3a818a](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/b3a818a0820682f1cb4d074b6301266b569e7757))
* add nginx configuration for serving frontend and API proxy ([601dc4e](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/601dc4e13d30986346badab17133b98fef52de3a))
* add release workflow for frontend with docker integration ([df5a6b3](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/df5a6b3bd20fe1d22f8f3edee1117e109852a09d))
* **frontend:** add product list and detail views ([a46e8b8](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/a46e8b876967bfafd2748130428ea5ba549c9127))
* Implement product management API and frontend components ([9f6cc86](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/9f6cc86346139e70a2594c91d796b8174ccc16ea))
* restructure Dockerfile for multi-stage builds and add healthcheck ([838e2ce](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/838e2ce6e4ce33748a66d1b1956abc9960eab2b4))
* specify build target for frontend service in docker-compose.yml ([6a992f7](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/6a992f79b86297ced09272c2af76d1299d4b074c))


### Bug Fixes

* add detect-changes job to filter modified components before docker push ([99c4d37](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/99c4d37b0e44710efc2321fc68a929664669a010))
* comment out condition for docker-push job to always run ([d9a63a4](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/d9a63a445896cefded369c41666602ba04aa739a))
* refactor smoke test implementation and move to separate script ([9135704](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/913570490530f2343a86b71ee1ca44131c0b7b58))
* remove redundant smoke test environment variables in release workflow ([9134ba9](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/9134ba989f3b716fc8f7c6339eecf236986af02f))
* update app title to include timestamp ([dbefb83](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/dbefb832769adefde647546526dd5b82f87904a1))
* update app title to reflect current timestamp ([15fc1ab](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/15fc1abc273414ebf323685ecf1d580675dd6b9a))
* update docker-push job condition to only run on release creation ([235ea21](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/235ea21aac2c11fcbe6e1e20790a005c143c3d47))
* update health check documentation and clarify endpoint purpose ([22e03ff](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/22e03ffec9db4092ac82c39430ace6c3bf4ebc0b))
* update nginx configuration to use BACKEND_URL environment variable directly ([2d62c82](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/2d62c82670969d871368ae1848c9532e562d0dd0))
* update permissions for pull-requests in release workflow ([b6b2678](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/b6b2678d2771fb88cd5c43db1b11e1673bcc5505))
* update regex pattern for version extraction in release-please config ([8ea89ca](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/8ea89caf33637f95c9cbe423f6594259ea5c931a))
* update smoke test script permissions to executable ([94ddd3e](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/94ddd3e56a980fa231fe8ceeef4a64a221e58ed7))
* update smoke test scripts for backend and frontend to use TAGS environment variable ([b69fc5d](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/b69fc5d00a232c224f3e407b770dbf0439e0eece))


### Code Refactoring

* simplify backend and frontend service definitions in docker-compose ([bfe460f](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/bfe460f94215e436b1716485a2174f3dabd0977c))
* streamline Dockerfile by removing redundant steps and optimizing dependency installation ([58d9a5c](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/58d9a5c25853eea390cf7c5a24bb3cb7309d707a))
* update Dockerfile to use Node 22.14-alpine and improve build stages ([ca21bc7](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/ca21bc7f8c6d79f5bb1a792cbe4c84ec040e7ff5))


### Tests

* **backend:** rebuild test foundation with injected sessions and dedicated test DB ([1aaf0c6](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/1aaf0c67d08018c3d3ac9e2b62916326d92670c6))


### Continuous Integration

* add release automation, PR title check, and Docker Hub push workflow ([435da7b](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/435da7b6e02c41be976fecc503ac90e1c525cf74))
* bump actions to latest major versions to fix Node.js 20 deprecation ([e71ff05](https://github.com/ahmedMahfouz5/ecommerce-platform/commit/e71ff056f44c13d927c7a5aa8621bbd639992949))
