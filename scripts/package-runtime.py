"""Build the pinned CUDA runtime and bundle its non-driver dependencies."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile

pin = json.loads(Path('lib/engine.json').read_text())
root = Path(os.environ['RUNNER_TEMP']) / 'dory-runtime'
source, build, package = root / 'source', root / 'build', root / 'package'
def run(*args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs)
def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(4 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()
root.mkdir(parents=True, exist_ok=True)
run('git', 'init', str(source))
run('git', '-C', str(source), 'fetch', '--depth=1', pin['source'], pin['revision'])
run('git', '-C', str(source), 'checkout', '--detach', 'FETCH_HEAD')
assert run('git', '-C', str(source), 'rev-parse', 'HEAD^{tree}').strip() == pin['tree']
subprocess.run(['cmake', '-S', str(source), '-B', str(build), '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release', '-DGGML_CUDA=ON', '-DGGML_NATIVE=OFF', '-DGGML_CUDA_FA_ALL_QUANTS=OFF', '-DLLAMA_CURL=OFF', '-DLLAMA_BUILD_TESTS=OFF', '-DCMAKE_CUDA_ARCHITECTURES=120'], check=True)
subprocess.run(['cmake', '--build', str(build), '--target', 'llama-server', '--parallel', '4'], check=True)
package.mkdir()
libs = package / 'lib'
libs.mkdir()
licenses = package / 'licenses'
licenses.mkdir()
shutil.copy2(build / 'bin/llama-server', package / 'llama-server.bin')
env = dict(os.environ, LD_LIBRARY_PATH=str(build / 'bin') + ':/usr/local/cuda-13.1/targets/x86_64-linux/lib')
output = run('ldd', str(build / 'bin/llama-server'), env=env)
assert 'not found' not in output, output
# ldd includes the transitive dependency closure. Keep the host driver and glibc
# on the host; CUDA, ggml and C++ runtime libraries travel with the executable.
excluded = ('libc.so', 'libm.so', 'libpthread.so', 'libdl.so', 'librt.so', 'libcuda.', 'libnvidia-')
for line in output.splitlines():
    m = re.match(r'\s*(\S+) => (/.*?) \(', line)
    if m and not m[1].startswith(excluded):
        shutil.copy2(Path(m[2]).resolve(), libs / m[1])
(package / 'llama-server').write_text('#!/bin/sh\ndirectory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nexport LD_LIBRARY_PATH="$directory/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"\nexec "$directory/llama-server.bin" "$@"\n')
(package / 'llama-server').chmod(0o755)
shutil.copy2(source / 'LICENSE', licenses / 'llama.cpp-MIT.txt')
for owner in ('libstdc++6', 'libgcc-s1', 'libgomp1'):
    path = Path('/usr/share/doc') / owner / 'copyright'
    if path.exists():
        shutil.copy2(path.resolve(), licenses / (owner + '.txt'))
for name in ('EULA.txt', 'LICENSE'):
    path = Path('/usr/local/cuda-13.1') / name
    if path.exists():
        shutil.copy2(path, licenses / ('CUDA-' + name))
(licenses / 'SOURCE-NOTICE.txt').write_text('Source: ' + pin['source'] + '\nCommit: ' + pin['revision'] + '\nCUDA 13.1 runtime redistributables from NVIDIA. Ubuntu 24.04 C++/OpenMP runtime libraries from Ubuntu packages; corresponding sources are available from Ubuntu archives. Host glibc 2.39+, NVIDIA driver and Linux x64 required. CUDA architecture 120 only.\n')
files = [{'name': str(p.relative_to(package)), 'size': p.stat().st_size, 'sha256': digest(p)} for p in sorted(package.rglob('*')) if p.is_file()]
metadata = {'version': 1, 'revision': pin['revision'], 'tree': pin['tree'], 'platform': 'linux-x64', 'architectures': ['120'], 'glibc': '2.39', 'cuda': '13.1', 'files': files}
(package / 'runtime.json').write_text(json.dumps(metadata, indent=2) + '\n')
out = Path('dist-runtime')
out.mkdir(exist_ok=True)
archive = out / 'dory-linux-x64-sm120.tar.gz'
with tarfile.open(archive, 'w:gz') as tar:
    tar.add(package, arcname='runtime')
manifest = {**metadata, 'archive': {'name': archive.name, 'size': archive.stat().st_size, 'sha256': digest(archive)}}
(out / 'runtime-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
