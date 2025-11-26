/**
 * BMad Mode Changer - Installer Module
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 템플릿 파일 경로 (pkg 빌드 시 스냅샷에 포함됨)
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * 설치 대상 디렉토리 결정
 */
function getTargetDir(options) {
  if (options.global) {
    return path.join(os.homedir(), '.claude');
  }
  return path.join(process.cwd(), '.claude');
}

/**
 * 디렉토리가 없으면 생성
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 파일 복사 (템플릿에서 대상으로)
 */
function copyTemplate(templateName, targetPath, options) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templateName}`);
  }

  if (fs.existsSync(targetPath) && !options.force) {
    console.log(`  ⏭️  건너뜀 (이미 존재): ${path.basename(targetPath)}`);
    return false;
  }

  const content = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`  ✅ 생성됨: ${path.basename(targetPath)}`);
  return true;
}

/**
 * settings.json 또는 settings.local.json 업데이트
 */
function updateSettings(targetDir, options) {
  const settingsPath = options.global
    ? path.join(targetDir, 'settings.json')
    : path.join(targetDir, 'settings.local.json');

  let settings = {};

  // 기존 설정 로드
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.log(`  ⚠️  기존 설정 파일 파싱 실패, 새로 생성합니다.`);
    }
  }

  // hooks 설정 추가
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // UserPromptSubmit hook 추가
  const hookConfig = {
    hooks: [
      {
        type: 'command',
        command: 'node .claude/hooks/agent-state-manager.js'
      }
    ]
  };

  // 이미 존재하는지 확인
  const existingHooks = settings.hooks.UserPromptSubmit || [];
  const alreadyExists = existingHooks.some(h =>
    h.hooks?.some(hook => hook.command?.includes('agent-state-manager'))
  );

  if (alreadyExists && !options.force) {
    console.log(`  ⏭️  건너뜀 (이미 설정됨): hooks.UserPromptSubmit`);
  } else {
    if (!settings.hooks.UserPromptSubmit) {
      settings.hooks.UserPromptSubmit = [];
    }

    // 기존 agent-state-manager 설정 제거 후 추가
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(h =>
      !h.hooks?.some(hook => hook.command?.includes('agent-state-manager'))
    );
    settings.hooks.UserPromptSubmit.push(hookConfig);

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`  ✅ 업데이트됨: ${path.basename(settingsPath)}`);
  }
}

/**
 * CLAUDE.md에 규칙 추가
 */
function updateClaudeMd(options) {
  const claudeMdPath = options.global
    ? path.join(os.homedir(), '.claude', 'CLAUDE.md')
    : path.join(process.cwd(), 'CLAUDE.md');

  const ruleContent = fs.readFileSync(
    path.join(TEMPLATES_DIR, 'claude-md-rules.md'),
    'utf8'
  );

  let existingContent = '';
  if (fs.existsSync(claudeMdPath)) {
    existingContent = fs.readFileSync(claudeMdPath, 'utf8');
  }

  // 이미 규칙이 있는지 확인
  if (existingContent.includes('모드 변경(Shift+Tab) 후 에이전트 자동 복원')) {
    console.log(`  ⏭️  건너뜀 (이미 존재): CLAUDE.md 규칙`);
    return;
  }

  // 규칙 추가
  const newContent = existingContent + '\n' + ruleContent;
  fs.writeFileSync(claudeMdPath, newContent, 'utf8');
  console.log(`  ✅ 추가됨: CLAUDE.md 규칙`);
}

/**
 * 설치 실행
 */
async function install(options = {}) {
  console.log('\n🎭 BMad Mode Changer 설치 중...\n');

  const targetDir = getTargetDir(options);
  const hooksDir = path.join(targetDir, 'hooks');

  // 디렉토리 생성
  ensureDir(targetDir);
  ensureDir(hooksDir);
  console.log(`📁 대상 디렉토리: ${targetDir}\n`);

  // 1. Hook 스크립트 복사
  console.log('1️⃣ Hook 스크립트 설치:');
  copyTemplate('agent-state-manager.js', path.join(hooksDir, 'agent-state-manager.js'), options);

  // 2. 설정 파일 업데이트
  console.log('\n2️⃣ 설정 파일 업데이트:');
  updateSettings(targetDir, options);

  // 3. CLAUDE.md 규칙 추가
  console.log('\n3️⃣ CLAUDE.md 규칙 추가:');
  updateClaudeMd(options);

  console.log('\n✨ 설치 완료!\n');
  console.log('사용 방법:');
  console.log('  1. /BMad:agents:* 명령어로 에이전트 활성화');
  console.log('  2. Shift+Tab으로 모드 변경');
  console.log('  3. 메시지 입력 시 에이전트 자동 복원\n');
}

/**
 * 제거 실행
 */
async function uninstall(options = {}) {
  console.log('\n🗑️ BMad Mode Changer 제거 중...\n');

  const targetDir = getTargetDir(options);
  const hookPath = path.join(targetDir, 'hooks', 'agent-state-manager.js');
  const contextPath = path.join(targetDir, '.agent-context.json');

  // Hook 스크립트 삭제
  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
    console.log('  ✅ 삭제됨: agent-state-manager.js');
  }

  // 컨텍스트 파일 삭제
  if (fs.existsSync(contextPath)) {
    fs.unlinkSync(contextPath);
    console.log('  ✅ 삭제됨: .agent-context.json');
  }

  console.log('\n⚠️  수동으로 제거해야 할 항목:');
  console.log('  - settings.local.json에서 UserPromptSubmit hook 제거');
  console.log('  - CLAUDE.md에서 "모드 변경 후 에이전트 자동 복원" 섹션 제거\n');
}

/**
 * 상태 확인
 */
async function status(options = {}) {
  console.log('\n📊 BMad Mode Changer 상태\n');

  const targetDir = getTargetDir(options);
  const hookPath = path.join(targetDir, 'hooks', 'agent-state-manager.js');
  const settingsPath = options.global
    ? path.join(targetDir, 'settings.json')
    : path.join(targetDir, 'settings.local.json');
  const contextPath = path.join(targetDir, '.agent-context.json');

  console.log(`대상 디렉토리: ${targetDir}\n`);

  // Hook 스크립트
  const hookExists = fs.existsSync(hookPath);
  console.log(`Hook 스크립트: ${hookExists ? '✅ 설치됨' : '❌ 없음'}`);

  // 설정 파일
  let settingsConfigured = false;
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      settingsConfigured = settings.hooks?.UserPromptSubmit?.some(h =>
        h.hooks?.some(hook => hook.command?.includes('agent-state-manager'))
      );
    } catch (e) {}
  }
  console.log(`Hook 설정: ${settingsConfigured ? '✅ 구성됨' : '❌ 없음'}`);

  // 컨텍스트 파일
  if (fs.existsSync(contextPath)) {
    try {
      const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      console.log(`\n현재 저장된 에이전트: ${context.activeAgent || '없음'}`);
      console.log(`저장 시간: ${context.savedAt || '알 수 없음'}`);
    } catch (e) {
      console.log('\n컨텍스트 파일: ⚠️ 파싱 오류');
    }
  } else {
    console.log('\n컨텍스트 파일: 아직 생성되지 않음');
  }

  console.log('');
}

module.exports = {
  install,
  uninstall,
  status
};
