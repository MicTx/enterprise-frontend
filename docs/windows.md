# Windows installation

Install only the runtime bundle defined by `manifest.json`. Do not copy the repository root into an agent skill directory, because the repository also contains maintenance scripts, evaluations, Git metadata, and documentation that are not runtime inputs.

## Requirements

- Windows 10 or 11
- Git
- Python 3.9+
- PowerShell 5.1+ or WSL
- a compatible skill-aware agent tool

## Option 1: WSL

Run the standard installer inside the same environment where the agent stores its home directory:

```bash
git clone https://github.com/MicTx/enterprise-frontend.git
cd enterprise-frontend
./install.sh
```

Important: a Windows-native agent and a WSL-native agent normally use different home directories. Running the installer in WSL installs into the WSL home unless `CODEX_HOME` or `CLAUDE_HOME` points to a mounted Windows path.

Example for a Windows Claude directory mounted in WSL:

```bash
CLAUDE_HOME="/mnt/c/Users/<username>/.claude" ./install.sh --claude-only
```

## Option 2: Native PowerShell

Clone the repository and ask the bundled Python packager to create a clean runtime directory.

```powershell
cd $env:USERPROFILE\Downloads
git clone https://github.com/MicTx/enterprise-frontend.git
cd enterprise-frontend

$destination = "$env:USERPROFILE\.claude\skills\enterprise-frontend"
python scripts\package_skill.py --dest $destination
```

For Codex:

```powershell
$destination = "$env:USERPROFILE\.codex\skills\enterprise-frontend"
python scripts\package_skill.py --dest $destination
```

For the universal agents path:

```powershell
$destination = "$env:USERPROFILE\.agents\skills\enterprise-frontend"
python scripts\package_skill.py --dest $destination
```

The packager stages before replacement and attempts to restore the previous tree if the final move fails. Unlike `install.sh`, it does **not** retain a backup after success; copy customized content to a separate location first if you need it.

`package_skill.py` replaces the destination with exactly the runtime entries from `manifest.json`, so files removed by a newer release cannot remain as stale guidance.

## Verify

```powershell
Test-Path "$env:USERPROFILE\.claude\skills\enterprise-frontend\SKILL.md"
Test-Path "$env:USERPROFILE\.claude\skills\enterprise-frontend\references\antd\llms-full.txt"
Test-Path "$env:USERPROFILE\.claude\skills\enterprise-frontend\README.md"
```

The first two checks should return `True`. The last should return `False`, because README is repository documentation rather than runtime guidance.

Restart the agent after installation.

## Update

```powershell
cd $env:USERPROFILE\Downloads\enterprise-frontend
git pull --ff-only
python scripts\validate_project.py
python scripts\package_skill.py --dest "$env:USERPROFILE\.claude\skills\enterprise-frontend"
```

Repeat the package command for each installed agent directory.

## Troubleshooting

### `python` is not recognized

Install Python 3.9 or newer, enable “Add Python to PATH,” reopen PowerShell, and run:

```powershell
python --version
```

### Access denied

Close the agent before replacing its skill directory. Confirm the destination is inside your user profile and is not read-only. Administrator privileges should not normally be required.

### Skill is not recognized

Confirm `SKILL.md` is directly below `<agent-home>\skills\enterprise-frontend`, then fully restart the agent.

### WSL install is invisible to the Windows agent

The installer wrote to the WSL home. Use the native PowerShell method or pass the mounted Windows tool home explicitly as shown above.

### Existing files survive an update

Use `package_skill.py`, which replaces the destination. Avoid `Copy-Item -Recurse -Force` over an existing tree because it does not guarantee deletion of files removed upstream.

## Repository checks

Contributors can run the repository validator from PowerShell:

```powershell
python scripts\validate_project.py
```

This includes manifest/evaluation JSON and offline-index checks. Use [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the remaining maintenance gates; Bash installer checks require WSL or another Bash environment. Usage is in [`../README.md`](../README.md).
