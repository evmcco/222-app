# OTA releases with EAS Update

222 Sports can receive JavaScript, styling, and bundled asset changes through EAS Update. Native code, native dependencies, permissions, and Expo SDK changes require a new binary. Existing builds created before this configuration cannot receive OTAs.

## Configuration

- `app.json` points to the existing EAS project and uses `runtimeVersion.policy: appVersion`.
- `eas.json` assigns development, preview, and production builds their matching channel and EAS environment.
- Preview and production are release builds. Updates download in the background at startup and apply after a subsequent restart. No forced reload or custom update UI is required.
- An offline launch uses the embedded bundle or an already downloaded update. App data still follows its existing network/cache behavior.

The runtime is currently `1.2.0`, from `expo.version`. Keep that version for compatible OTA changes. Before changing native code or configuration that affects the native runtime, bump `expo.version` (and keep `package.json` aligned), then build new binaries. The production profile's `autoIncrement` changes build numbers/version codes, not this runtime version. Never publish a native-dependent change under an older runtime.

## First rollout

Install EAS CLI (`npm install --global eas-cli`) and sign in with `eas login` to an account with access to the existing project. Install repository dependencies with `npm ci`.

1. Create preview builds with `eas build --profile preview --platform all` and install them on test devices. For iOS internal distribution, register devices when prompted.
2. Make a small visible JavaScript change, publish to preview using the command below, and verify it on both platforms. Allow the app to launch online and download the update, then fully close and reopen it. Record the update group, runtime, and build IDs.
3. Launch each preview build offline and confirm it still starts. Confirm in the EAS dashboard that each build has the expected channel and runtime, and that preview publishing leaves the production channel unchanged.
4. Build production binaries with `eas build --profile production --platform all`, submit through the usual store workflow, and release them. Users must install this store release to start receiving OTAs.

The native directories are generated and ignored by Git. EAS Build generates them from the committed configuration. If building locally from an existing `ios/` or `android/` directory, regenerate it and install native dependencies before building; the old native project will not acquire OTA support just by restarting Metro. Preserve any local native changes before regeneration. Local release builds also need the intended update channel embedded; use EAS Build profiles (including `eas build --local`) to apply it consistently.

## Publish a compatible update

Start from the intended committed revision with a clean working tree. Validate it before publishing:

```bash
npm run lint
npx tsc --noEmit
node --test tests/*.test.cjs
npx expo export --platform all
```

Publish and test preview first:

```bash
npm run update:preview -- --message "Describe the fix"
```

Publish the same tested commit to production:

```bash
npm run update:production -- --message "Describe the fix"
```

These commands upload updates; they do not build or submit a new binary. Both platforms are included by default. Only installations matching the channel, platform, and runtime can receive them. Development clients/Expo Go are not a substitute for testing automatic update delivery in a release build.

Builds and update commands explicitly select the matching EAS environment. The app currently has no environment-variable-dependent client configuration; its existing backend client configuration is bundled in code. If introducing `EXPO_PUBLIC_*` configuration, define the values in each EAS environment and use the same environment for builds and updates. Do not rely on `build.<profile>.env` being applied during `eas update`, and never place server secrets in the client bundle. Test any intentional preview/production environment differences before release.

## Rollback and monitoring

Run `eas update:rollback` and select the affected channel/runtime and a known-good update, or roll back to the bundle embedded in that binary. Verify recovery on a device after the next online launch/download and restart. A rollback cannot fix incompatible native code; that needs a new build. Do not delete an update and assume that devices already running it will revert.

Use the EAS dashboard to inspect update/build runtime versions, channel mappings, and downloads. Check Billing > Usage for updated installations, bandwidth, and overages. OTA allowances are part of the existing EAS plan; review current usage before deciding whether a plan upgrade is necessary.

## References

- [EAS Update setup](https://docs.expo.dev/eas-update/getting-started/)
- [Runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/)
- [Rollbacks](https://docs.expo.dev/eas-update/rollbacks/)
- [Pricing](https://expo.dev/pricing)
