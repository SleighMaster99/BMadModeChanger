# BMad Mode Changer

Claude Code에서 모드 변경(Shift+Tab) 후에도 BMad 에이전트 상태를 자동으로 복원합니다.

## 문제

Claude Code에서 `Shift+Tab`으로 모드(plan mode, auto mode 등)를 변경하면 활성화된 BMad 에이전트 페르소나가 초기화됩니다.

## 해결책

이 도구는 Hook 시스템을 사용하여 에이전트 상태를 파일에 저장하고, 모드 변경 후 자동으로 복원합니다.

## 설치

### NPX (권장)

```bash
# 현재 프로젝트에 설치
npx bmad-mode-changer install

# 전역 설치 (~/.claude/)
npx bmad-mode-changer install --global
```

### EXE (Windows)

[Releases](https://github.com/SleighMaster99/BMadModeChanger/releases)에서 `bmad-mode-changer.exe`를 다운로드하여 실행합니다.

```cmd
bmad-mode-changer.exe install
```

## 사용법

설치 후 자동으로 작동합니다:

1. `/BMad:agents:bmad-orchestrator` 등의 명령어로 에이전트 활성화
2. `Shift+Tab`으로 모드 변경
3. 아무 메시지나 입력 → 에이전트 자동 복원

## 명령어

```bash
npx bmad-mode-changer install     # 설치
npx bmad-mode-changer uninstall   # 제거
npx bmad-mode-changer status      # 상태 확인
npx bmad-mode-changer help        # 도움말
```

### 옵션

- `--global, -g` : 전역 설정에 설치 (`~/.claude/`)
- `--force, -f` : 기존 파일 덮어쓰기 (업데이트 시 사용)

## 업데이트

기존 설치를 최신 버전으로 업데이트하려면 `--force` 옵션을 사용하세요:

```bash
npx bmad-mode-changer install --force
```

이 명령은 CLAUDE.md의 규칙을 최신 버전으로 교체합니다.

## 작동 원리

1. **UserPromptSubmit Hook**: 사용자가 프롬프트를 제출할 때마다 실행
2. **에이전트 감지**: `/BMad:agents:*` 명령어 패턴 감지
3. **상태 저장**: `.claude/.agent-context.json`에 활성 에이전트 정보 저장
4. **자동 복원**: CLAUDE.md 규칙에 따라 모드 변경 후 에이전트 자동 복원

## 설치되는 파일

| 파일 | 설명 |
|------|------|
| `.claude/hooks/agent-state-manager.js` | Hook 스크립트 |
| `.claude/settings.local.json` | Hook 설정 (업데이트) |
| `CLAUDE.md` | 복원 규칙 (추가) |

## EXE 빌드 (개발자용)

```bash
npm install
npm run build:exe      # Windows용
npm run build:all      # 모든 플랫폼
```

## 변경 이력

### v1.0.2
- 새 세션에서 에이전트 활성화 시 불필요한 자동 복원 메시지가 표시되던 문제 수정
- 자동 복원 조건 명확화: 동일 세션 내 모드 변경 시에만 복원
- `--force` 옵션으로 기존 CLAUDE.md 규칙 업데이트 지원

### v1.0.1
- 제거(uninstall) 시 bmad-mode-changer 설정만 깔끔하게 제거하도록 개선

### v1.0.0
- 최초 릴리스

## 라이선스

MIT

## 작성자

- GitHub: [@SleighMaster99](https://github.com/SleighMaster99)
