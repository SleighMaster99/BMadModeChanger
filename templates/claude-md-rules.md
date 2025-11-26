
## 모드 변경(Shift+Tab) 후 에이전트 자동 복원 (BMad Mode Changer)

> 이 섹션은 BMad Mode Changer에 의해 추가되었습니다.
> 설치: `npx bmad-mode-changer install`

Shift+Tab으로 모드(plan mode, auto mode 등)를 변경한 후 **첫 번째 응답에서** 반드시 다음을 수행하세요:

1. **상태 파일 확인**: `.claude/.agent-context.json` 파일이 존재하는지 확인하세요.

2. **저장된 에이전트 복원**: 파일이 존재하고 `activeAgent` 값이 있으면, 해당 에이전트를 **사용자에게 묻지 않고** 즉시 재활성화하세요.

3. **복원 알림**: 에이전트를 복원한 후 다음과 같이 알려주세요:
   ```
   [모드 변경 후 자동 복원] BMad {에이전트명} 에이전트가 재활성화되었습니다.
   ```

4. **파일이 없거나 에이전트 정보가 없는 경우**: 대화 컨텍스트에서 이전 에이전트 정보를 찾아 복원하거나, 찾을 수 없으면 사용자에게 에이전트 선택을 요청하세요.

> **참고**: Hook 시스템이 `/BMad:agents:*` 명령어 실행 시 자동으로 에이전트 상태를 `.claude/.agent-context.json`에 저장합니다.
