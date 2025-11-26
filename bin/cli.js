#!/usr/bin/env node

/**
 * BMad Mode Changer CLI
 * Claude Code BMad Agent State Persistence Tool
 */

const installer = require('../src/index.js');

const args = process.argv.slice(2);
const command = args[0];

const HELP_TEXT = `
╔══════════════════════════════════════════════════════════════╗
║           BMad Mode Changer - Agent State Persistence        ║
╚══════════════════════════════════════════════════════════════╝

Claude Code에서 모드 변경(Shift+Tab) 후에도
BMad 에이전트 상태를 자동으로 복원합니다.

사용법:
  npx bmad-mode-changer install    현재 프로젝트에 설치
  npx bmad-mode-changer uninstall  현재 프로젝트에서 제거
  npx bmad-mode-changer status     설치 상태 확인
  npx bmad-mode-changer help       이 도움말 표시

옵션:
  --global, -g    전역 설정에 설치 (~/. claude/)
  --force, -f     기존 파일 덮어쓰기

예시:
  npx bmad-mode-changer install          # 현재 프로젝트에 설치
  npx bmad-mode-changer install -g       # 전역 설치
  npx bmad-mode-changer uninstall        # 제거

GitHub: https://github.com/SleighMaster99/BMadModeChanger
`;

async function main() {
  const options = {
    global: args.includes('--global') || args.includes('-g'),
    force: args.includes('--force') || args.includes('-f')
  };

  switch (command) {
    case 'install':
      await installer.install(options);
      break;
    case 'uninstall':
      await installer.uninstall(options);
      break;
    case 'status':
      await installer.status(options);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP_TEXT);
      break;
    default:
      console.error(`알 수 없는 명령어: ${command}`);
      console.log('도움말을 보려면: npx bmad-mode-changer help');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('오류 발생:', err.message);
  process.exit(1);
});
