from __future__ import annotations

import codecs
import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

DEMO_AI_ENGINE_PORTS = {
    "fraud-detection": "8004",
    "fraud-ring-gnn": "8005",
    "pa-nlp-matcher": "8006",
    "denial-predictor": "8007",
    "crisis-detector": "8009",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def refresh_block(script: str, pattern: str, script_name: str) -> str:
    match = re.search(pattern, script, re.DOTALL)
    if match is None:
        raise AssertionError(f"Could not locate refresh-engines block in {script_name}")
    return match.group("block")


def compose_command_text(block: str, action: str) -> str:
    command_lines = [
        line.strip()
        for line in block.splitlines()
        if "docker compose" in line and f" {action} " in f" {line} "
    ]
    if not command_lines:
        raise AssertionError(f"No docker compose {action} command found in refresh block")
    return "\n".join(command_lines)


class DeployDemoScriptTests(unittest.TestCase):
    def test_deploy_scripts_are_utf8_text(self) -> None:
        script_paths = sorted((ROOT / "deploy").glob("*.sh"))
        script_paths.extend(sorted((ROOT / "deploy").glob("*.ps1")))
        script_paths.append(ROOT / "infrastructure/docker/kafka-init-demo.sh")

        for path in script_paths:
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                raw = path.read_bytes()
                self.assertFalse(
                    raw.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)),
                    "script must not be UTF-16 encoded",
                )
                self.assertNotIn(
                    b"\x00",
                    raw[:1024],
                    "script contains NUL bytes, which usually indicates UTF-16 text",
                )
                raw.decode("utf-8")

    def test_bash_scripts_parse(self) -> None:
        script_paths = sorted((ROOT / "deploy").glob("*.sh"))
        script_paths.append(ROOT / "infrastructure/docker/kafka-init-demo.sh")

        for path in script_paths:
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                result = subprocess.run(
                    ["bash", "-n", str(path)],
                    cwd=ROOT,
                    capture_output=True,
                    check=False,
                    text=True,
                )
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_preflight_checks_every_demo_ai_engine(self) -> None:
        bash_preflight = read_text(ROOT / "deploy/demo-preflight.sh")
        powershell_preflight = read_text(ROOT / "deploy/demo-preflight.ps1")

        for engine, port in DEMO_AI_ENGINE_PORTS.items():
            with self.subTest(engine=engine):
                self.assertRegex(
                    bash_preflight,
                    rf"grep -qx {re.escape(engine)}\b",
                    f"demo-preflight.sh must assert {engine} is running",
                )
                self.assertIn(
                    f'$running -contains "{engine}"',
                    powershell_preflight,
                    f"demo-preflight.ps1 must assert {engine} is running",
                )
                self.assertIn(f"http://localhost:{port}/health", bash_preflight)
                self.assertIn(f"http://localhost:{port}/health", powershell_preflight)

    def test_refresh_engines_rebuilds_and_restarts_all_demo_ai_engines(self) -> None:
        shell_block = refresh_block(
            read_text(ROOT / "deploy/laptop.sh"),
            r'elif \[\[ "\$\{1:-\}" == "--refresh-engines" \]\]; then(?P<block>.*?)elif \[\[ "\$\{1:-\}" == "--verify" \]\]; then',
            "deploy/laptop.sh",
        )
        powershell_block = refresh_block(
            read_text(ROOT / "deploy/demo-up.ps1"),
            r"elseif \(\$RefreshEngines\) \{(?P<block>.*?)\} elseif \(-not \$SkipBuild\)",
            "deploy/demo-up.ps1",
        )

        for block, script_name in (
            (shell_block, "deploy/laptop.sh"),
            (powershell_block, "deploy/demo-up.ps1"),
        ):
            build_command = compose_command_text(block, "build")
            up_command = compose_command_text(block, "up")
            for engine in DEMO_AI_ENGINE_PORTS:
                with self.subTest(script=script_name, engine=engine):
                    self.assertIn(engine, build_command)
                    self.assertIn(engine, up_command)


if __name__ == "__main__":
    unittest.main()
