/**
 * BMad Agent State Manager Hook
 *
 * 이 스크립트는 UserPromptSubmit hook으로 실행되며,
 * BMad 에이전트 상태를 파일에 저장하여 모드 변경 후에도 복원할 수 있게 합니다.
 *
 * 설치: npx bmad-mode-changer install
 * GitHub: https://github.com/SleighMaster99/BMadModeChanger
 */

const fs = require('fs');
const path = require('path');

const CONTEXT_FILE = path.join(__dirname, '..', '.agent-context.json');

// stdin에서 hook input 읽기
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const hookInput = JSON.parse(input);
    const userPrompt = hookInput.user_prompt || '';

    // BMad 에이전트 명령어 감지 (슬래시 명령어)
    const agentMatch = userPrompt.match(/\/BMad:agents:([\w-]+)/i);

    if (agentMatch) {
      // 새 에이전트 활성화 - 상태 저장
      saveAgentState(agentMatch[1]);
    }

    // 수정 없이 통과 (빈 객체 반환)
    console.log(JSON.stringify({}));
  } catch (error) {
    // 에러 발생 시에도 정상 통과
    console.log(JSON.stringify({}));
  }
});

/**
 * 에이전트 상태를 파일에 저장
 * @param {string} agentName - 활성화된 에이전트 이름
 */
function saveAgentState(agentName) {
  const context = {
    activeAgent: agentName,
    savedAt: new Date().toISOString(),
    command: `/BMad:agents:${agentName}`
  };

  try {
    fs.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2), 'utf8');
  } catch (error) {
    // 파일 쓰기 실패 시 무시 (hook 실행에 영향 없음)
  }
}
