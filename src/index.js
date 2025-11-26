/**
 * BMad Mode Changer - Installer Module
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 템플릿 파일 경로 (pkg 빌드 시 스냅샷에 포함됨)
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// 현재 패키지 버전
const CURRENT_VERSION = require('../package.json').version;

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
 * 버전 파일 경로 반환
 */
function getVersionFilePath(targetDir) {
  return path.join(targetDir, '.bmad-version.json');
}

/**
 * 설치된 버전 읽기
 */
function getInstalledVersion(targetDir) {
  const versionPath = getVersionFilePath(targetDir);
  if (fs.existsSync(versionPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return data.version || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 버전 정보 저장
 */
function saveVersionInfo(targetDir) {
  const versionPath = getVersionFilePath(targetDir);
  const data = {
    version: CURRENT_VERSION,
    installedAt: new Date().toISOString()
  };
  fs.writeFileSync(versionPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 버전 비교 (semver 간단 구현)
 * @returns {number} 1: v1 > v2, -1: v1 < v2, 0: v1 === v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * 업데이트 필요 여부 확인
 */
function needsUpdate(targetDir) {
  const installedVersion = getInstalledVersion(targetDir);
  if (!installedVersion) return false; // 신규 설치
  return compareVersions(CURRENT_VERSION, installedVersion) > 0;
}

/**
 * 파일 복사 (템플릿에서 대상으로)
 */
function copyTemplate(templateName, targetPath, options) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templateName}`);
  }

  const shouldUpdate = options.force || options.shouldUpdate;

  if (fs.existsSync(targetPath) && !shouldUpdate) {
    console.log(`  ⏭️  건너뜀 (이미 존재): ${path.basename(targetPath)}`);
    return false;
  }

  const content = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(targetPath, content, 'utf8');

  if (options.shouldUpdate && !options.force) {
    console.log(`  🔄 업데이트됨: ${path.basename(targetPath)}`);
  } else {
    console.log(`  ✅ 생성됨: ${path.basename(targetPath)}`);
  }
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

  const shouldUpdate = options.force || options.shouldUpdate;

  if (alreadyExists && !shouldUpdate) {
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
  const shouldUpdate = options.force || options.shouldUpdate;

  if (existingContent.includes('모드 변경(Shift+Tab) 후 에이전트 자동 복원')) {
    if (!shouldUpdate) {
      console.log(`  ⏭️  건너뜀 (이미 존재): CLAUDE.md 규칙`);
      return;
    }
    // 업데이트 시 기존 섹션 제거 후 재추가
    const sectionRegex = /\n*## 모드 변경\(Shift\+Tab\) 후 에이전트 자동 복원[^]*?(?=\n## |\n# |$)/g;
    existingContent = existingContent.replace(sectionRegex, '');
    existingContent = existingContent.replace(/\n{3,}/g, '\n\n').trim();
  }

  // 규칙 추가
  const newContent = existingContent + '\n' + ruleContent;
  fs.writeFileSync(claudeMdPath, newContent, 'utf8');

  if (shouldUpdate) {
    console.log(`  🔄 업데이트됨: CLAUDE.md 규칙`);
  } else {
    console.log(`  ✅ 추가됨: CLAUDE.md 규칙`);
  }
}

/**
 * 설치 실행
 */
async function install(options = {}) {
  const targetDir = getTargetDir(options);
  const hooksDir = path.join(targetDir, 'hooks');

  // 버전 확인 및 업데이트 여부 결정
  const installedVersion = getInstalledVersion(targetDir);
  const isNewInstall = !installedVersion;
  const shouldUpdate = !isNewInstall && needsUpdate(targetDir);

  // options에 shouldUpdate 플래그 추가
  const installOptions = { ...options, shouldUpdate };

  // 헤더 메시지
  if (options.force) {
    console.log('\n🎭 BMad Mode Changer 강제 재설치 중...\n');
  } else if (shouldUpdate) {
    console.log(`\n🎭 BMad Mode Changer 업데이트 중... (${installedVersion} → ${CURRENT_VERSION})\n`);
  } else if (isNewInstall) {
    console.log('\n🎭 BMad Mode Changer 설치 중...\n');
  } else {
    console.log(`\n🎭 BMad Mode Changer v${CURRENT_VERSION}\n`);
    console.log(`이미 최신 버전이 설치되어 있습니다. (v${installedVersion})\n`);
    console.log('강제 재설치: npx bmad-mode-changer install --force\n');
    return;
  }

  // 디렉토리 생성
  ensureDir(targetDir);
  ensureDir(hooksDir);
  console.log(`📁 대상 디렉토리: ${targetDir}\n`);

  // 1. Hook 스크립트 복사
  console.log('1️⃣ Hook 스크립트 설치:');
  copyTemplate('agent-state-manager.js', path.join(hooksDir, 'agent-state-manager.js'), installOptions);

  // 2. 설정 파일 업데이트
  console.log('\n2️⃣ 설정 파일 업데이트:');
  updateSettings(targetDir, installOptions);

  // 3. CLAUDE.md 규칙 추가
  console.log('\n3️⃣ CLAUDE.md 규칙 추가:');
  updateClaudeMd(installOptions);

  // 4. 버전 정보 저장
  saveVersionInfo(targetDir);

  if (shouldUpdate) {
    console.log(`\n✨ 업데이트 완료! (v${CURRENT_VERSION})\n`);
  } else {
    console.log('\n✨ 설치 완료!\n');
    console.log('사용 방법:');
    console.log('  1. /BMad:agents:* 명령어로 에이전트 활성화');
    console.log('  2. Shift+Tab으로 모드 변경');
    console.log('  3. 메시지 입력 시 에이전트 자동 복원\n');
  }
}

/**
 * settings.json에서 bmad-mode-changer hook만 제거
 */
function removeFromSettings(targetDir, options) {
  const settingsPath = options.global
    ? path.join(targetDir, 'settings.json')
    : path.join(targetDir, 'settings.local.json');

  if (!fs.existsSync(settingsPath)) {
    console.log('  ⏭️  건너뜀 (파일 없음): settings 파일');
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    if (!settings.hooks?.UserPromptSubmit) {
      console.log('  ⏭️  건너뜀 (설정 없음): UserPromptSubmit hook');
      return;
    }

    // bmad-mode-changer hook만 제거 (다른 hook 유지)
    const originalLength = settings.hooks.UserPromptSubmit.length;
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(h =>
      !h.hooks?.some(hook => hook.command?.includes('agent-state-manager'))
    );

    // UserPromptSubmit이 비어있으면 제거
    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }

    // hooks 객체가 비어있으면 제거
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (settings.hooks?.UserPromptSubmit?.length !== originalLength || originalLength > 0) {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log('  ✅ 제거됨: settings hook 설정');
    }
  } catch (e) {
    console.log('  ⚠️  설정 파일 처리 중 오류:', e.message);
  }
}

/**
 * CLAUDE.md에서 bmad-mode-changer 섹션만 제거
 */
function removeFromClaudeMd(options) {
  const claudeMdPath = options.global
    ? path.join(os.homedir(), '.claude', 'CLAUDE.md')
    : path.join(process.cwd(), 'CLAUDE.md');

  if (!fs.existsSync(claudeMdPath)) {
    console.log('  ⏭️  건너뜀 (파일 없음): CLAUDE.md');
    return;
  }

  try {
    let content = fs.readFileSync(claudeMdPath, 'utf8');

    // BMad Mode Changer 섹션 찾기 및 제거
    // 섹션 시작: "## 모드 변경(Shift+Tab) 후 에이전트 자동 복원"
    // 섹션 끝: 다음 ## 또는 파일 끝
    const sectionRegex = /\n*## 모드 변경\(Shift\+Tab\) 후 에이전트 자동 복원[^]*?(?=\n## |\n# |$)/g;

    if (sectionRegex.test(content)) {
      content = content.replace(sectionRegex, '');
      // 연속된 빈 줄 정리
      content = content.replace(/\n{3,}/g, '\n\n').trim() + '\n';
      fs.writeFileSync(claudeMdPath, content, 'utf8');
      console.log('  ✅ 제거됨: CLAUDE.md 규칙 섹션');
    } else {
      console.log('  ⏭️  건너뜀 (섹션 없음): CLAUDE.md 규칙');
    }
  } catch (e) {
    console.log('  ⚠️  CLAUDE.md 처리 중 오류:', e.message);
  }
}

/**
 * 제거 실행
 */
async function uninstall(options = {}) {
  console.log('\n🗑️ BMad Mode Changer 제거 중...\n');

  const targetDir = getTargetDir(options);
  const hookPath = path.join(targetDir, 'hooks', 'agent-state-manager.js');
  const contextPath = path.join(targetDir, '.agent-context.json');
  const versionPath = getVersionFilePath(targetDir);

  // 1. Hook 스크립트 삭제
  console.log('1️⃣ Hook 스크립트 삭제:');
  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
    console.log('  ✅ 삭제됨: agent-state-manager.js');
  } else {
    console.log('  ⏭️  건너뜀 (파일 없음): agent-state-manager.js');
  }

  // 2. 컨텍스트 및 버전 파일 삭제
  if (fs.existsSync(contextPath)) {
    fs.unlinkSync(contextPath);
    console.log('  ✅ 삭제됨: .agent-context.json');
  }
  if (fs.existsSync(versionPath)) {
    fs.unlinkSync(versionPath);
    console.log('  ✅ 삭제됨: .bmad-version.json');
  }

  // 3. settings.local.json에서 hook 설정 제거
  console.log('\n2️⃣ 설정 파일 정리:');
  removeFromSettings(targetDir, options);

  // 4. CLAUDE.md에서 규칙 섹션 제거
  console.log('\n3️⃣ CLAUDE.md 정리:');
  removeFromClaudeMd(options);

  console.log('\n✨ 제거 완료!\n');
  console.log('다른 설정은 그대로 유지됩니다.\n');
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

  // 버전 정보
  const installedVersion = getInstalledVersion(targetDir);
  if (installedVersion) {
    const updateAvailable = needsUpdate(targetDir);
    console.log(`설치된 버전: v${installedVersion}${updateAvailable ? ` (업데이트 가능: v${CURRENT_VERSION})` : ' (최신)'}`);
  } else {
    console.log(`설치된 버전: 정보 없음`);
  }
  console.log(`최신 버전: v${CURRENT_VERSION}\n`);

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
