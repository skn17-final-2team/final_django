document.addEventListener("DOMContentLoaded", () => {
  const meetingDetailRoot = document.getElementById("meeting-detail-root");
  if (!meetingDetailRoot) return;

  const meetingId = meetingDetailRoot.dataset.meetingId || "";
  const csrfInput = document.getElementById("csrf-token");
  const csrftoken = csrfInput ? csrfInput.value : "";

  /* =========================================
   * 1. 탭 전환 (요약 / 태스크 / 회의록)
   * ========================================= */
  const tabButtons = document.querySelectorAll(".detail-tab");
  const tabPanels = document.querySelectorAll(".detail-tab-panel");

  function activateTab(tabName, btn) {
    // 탭 버튼 클래스 처리
    tabButtons.forEach((t) => t.classList.remove("detail-tab-active"));
    if (btn) {
      btn.classList.add("detail-tab-active");
    }

    // 패널 표시 처리
    tabPanels.forEach((panel) =>
      panel.classList.remove("detail-tab-panel-active")
    );
    const targetPanel = document.querySelector(
      `.detail-tab-panel[data-tab-panel="${tabName}"]`
    );
    if (targetPanel) {
      targetPanel.classList.add("detail-tab-panel-active");
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget; // summary / tasks / minutes
      activateTab(target, btn);

      if (target === "minutes") {
      // openMinutesConfig 함수는 아래쪽에서 선언되어 있음 (function 선언이라 호이스팅됨)
      if (typeof openMinutesConfig === "function") {
        openMinutesConfig();
      }
    }
    });
  });

  /* =========================================
   * 2. 회의 정보 팝업 (상단 제목 옆 화살표)
   * ========================================= */
  const meetingInfoToggle = document.getElementById("meeting-info-toggle");
  const meetingInfoOverlay = document.getElementById("meeting-info-overlay");
  const meetingInfoClose = document.getElementById("meeting-info-close");

  function openMeetingInfo() {
    if (!meetingInfoOverlay || !meetingInfoToggle) return;
    meetingInfoOverlay.style.display = "block";
    meetingInfoToggle.setAttribute("aria-expanded", "true");
  }

  function closeMeetingInfo() {
    if (!meetingInfoOverlay || !meetingInfoToggle) return;
    meetingInfoOverlay.style.display = "none";
    meetingInfoToggle.setAttribute("aria-expanded", "false");
  }

  if (meetingInfoToggle && meetingInfoOverlay) {
    meetingInfoToggle.addEventListener("click", () => {
      const expanded =
        meetingInfoToggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        closeMeetingInfo();
      } else {
        openMeetingInfo();
      }
    });
  }

  if (meetingInfoClose) {
    meetingInfoClose.addEventListener("click", closeMeetingInfo);
  }

  if (meetingInfoOverlay) {
    meetingInfoOverlay.addEventListener("click", (e) => {
      if (e.target === meetingInfoOverlay) {
        closeMeetingInfo();
      }
    });
  }

  /* =========================================
   * 3. 전문 관련: 전체 복사 / 음성 다운로드
   * ========================================= */
  const transcriptScroll = document.getElementById("detail-transcript-scroll");
  const btnCopyFullTranscript = document.getElementById(
    "btn-copy-full-transcript"
  );
  const btnAudioDownload = document.getElementById("btn-audio-download");

  if (btnCopyFullTranscript && transcriptScroll) {
    btnCopyFullTranscript.addEventListener("click", async () => {
      const text = transcriptScroll.innerText || transcriptScroll.textContent || "";
      if (!text.trim()) {
        alert("복사할 전문 내용이 없습니다.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        alert("전문 전체가 클립보드에 복사되었습니다.");
      } catch (err) {
        console.error("copy transcript error:", err);
        alert("클립보드 복사에 실패했습니다.");
      }
    });
  }

  if (btnAudioDownload && meetingId) {
    btnAudioDownload.addEventListener("click", () => {
      // 실제 다운로드 URL 패턴에 맞춰 조정 가능
      // 여기서는 일단 녹음 화면/다운로드를 담당하는 URL로 이동하도록 처리
      window.location.href = `/meetings/${meetingId}/record/`;
    });
  }

  /* =========================================
   * 4. 회의록( minutes ) 에디터 관련
   *    - 구성 선택 팝업
   *    - 템플릿에서 섹션 생성
   *    - 저장
   * ========================================= */

  // minutes 탭 안의 에디터만 명시적으로 선택
  const minutesEditor =
    document.querySelector("#tab-minutes #minutes-editor") ||
    document.getElementById("minutes-editor");
  const minutesTemplates = document.getElementById("minutes-templates");

  const minutesConfigOverlay = document.getElementById("minutes-config-overlay");
  const minutesConfigForm = document.getElementById("minutes-config-form");
  const btnMinutesConfigOpen = document.getElementById("minutes-config-open");
  const btnMinutesConfigConfirm = document.getElementById(
    "minutes-config-confirm"
  );
  const btnMinutesConfigCancel = document.getElementById(
    "minutes-config-cancel"
  );

  const btnMinutesSave = document.getElementById("btn-minutes-save");

  if (!minutesEditor || !minutesTemplates || !minutesConfigForm) {
    // 회의록 기능이 없는 화면이면 이하 로직은 생략
    return;
  }

  /* ---------- 유틸: 현재 에디터 섹션 키 목록 ---------- */
  function getCurrentSectionKeys() {
    return Array.from(
      minutesEditor.querySelectorAll("[data-minutes-section]")
    ).map((el) => el.getAttribute("data-minutes-section"));
  }

  /* ---------- 유틸: 팝업에서 체크된 섹션 키 ---------- */
  function getSelectedKeysFromForm() {
    return Array.from(
      minutesConfigForm.querySelectorAll('input[name="minutes_section"]:checked')
    ).map((input) => input.value);
  }

  /* ---------- 유틸: 기존 섹션 DOM ---------- */
  function findExistingSectionElement(key) {
    return minutesEditor.querySelector(`[data-minutes-section="${key}"]`);
  }

  /* ---------- 유틸: 템플릿 HTML ---------- */
  function getTemplateHtml(key) {
    const tpl = document.getElementById(`minutes-template-${key}`);
    if (!tpl) return "";
    return tpl.innerHTML.trim();
  }

  /* ---------- 에디터 재구성: 체크박스 상태 → 화면 ---------- */
  function buildMinutesEditorHtml() {
    const selectedKeys = getSelectedKeysFromForm();
    const htmlParts = [];

    selectedKeys.forEach((key) => {
      const existingEl = findExistingSectionElement(key);
      let bodyHtml = existingEl ? existingEl.innerHTML : "";

      if (!bodyHtml) {
        bodyHtml = getTemplateHtml(key);
      }

      let html_push = `<div class="minutes-section" data-minutes-section="${key}"`
      if (key == 'base') html_push += 'contenteditable="false"'
      html_push += `>${bodyHtml}</div>`
      if (bodyHtml) {
        htmlParts.push(
          html_push
        );
      }
    });

    minutesEditor.innerHTML = htmlParts.join("");
  }


  /* ---------- 저장용 HTML 생성 (base/attendees 제외) ---------- */
    function getMinutesHtmlForSaving() {
      const sectionEls = minutesEditor.querySelectorAll("[data-minutes-section]");
      const saveParts = [];

      sectionEls.forEach((el) => {
        const key = el.getAttribute("data-minutes-section");

        const cleaned = el.innerHTML
          .replace(/\n+/g, "\n")
          .replace(/[ \t]+/g, " ")
          .trim();

        
        saveParts.push(
          `<div class="minutes-section" data-minutes-section="${key}">${cleaned}</div>`
        );
      });

      return saveParts.join("");
    }

  /* ---------- 팝업 열기/닫기 ---------- */
  function openMinutesConfig() {
    if (!minutesConfigOverlay) return;

    const currentKeys = new Set(getCurrentSectionKeys());

    minutesConfigForm
      .querySelectorAll('input[name="minutes_section"]')
      .forEach((input) => {
        if (currentKeys.size === 0) {
          // 처음 진입이면 템플릿 기본 checked 유지
          return;
        }
        input.checked = currentKeys.has(input.value);
      });

    minutesConfigOverlay.style.display = "flex";
  }

  function closeMinutesConfig() {
    if (!minutesConfigOverlay) return;
    minutesConfigOverlay.style.display = "none";
  }

  if (btnMinutesConfigOpen) {
    btnMinutesConfigOpen.addEventListener("click", openMinutesConfig);
  }
  if (btnMinutesConfigCancel) {
    btnMinutesConfigCancel.addEventListener("click", closeMinutesConfig);
  }
  const btnMinutesConfigClose = document.getElementById("minutes-config-close");
  if (btnMinutesConfigClose) {
    btnMinutesConfigClose.addEventListener("click", closeMinutesConfig);
  }
  if (minutesConfigOverlay) {
    minutesConfigOverlay.addEventListener("click", (e) => {
      if (e.target === minutesConfigOverlay) {
        closeMinutesConfig();
      }
    });
  }

  if (btnMinutesConfigConfirm) {
    btnMinutesConfigConfirm.addEventListener("click", () => {
      buildMinutesEditorHtml();
      closeMinutesConfig();
    });
  }

  /* ---------- 초기 렌더링 ---------- */
  function initMinutesEditor() {
  const hasAnySection =
    minutesEditor.querySelector("[data-minutes-section]") != null;

  if (!hasAnySection) {
    // 저장된 섹션이 전혀 없으면: 체크박스 기본값으로 구성
    buildMinutesEditorHtml();
    }
  }


  /* ---------- 회의록 저장 ---------- */
  if (btnMinutesSave) {
    btnMinutesSave.addEventListener("click", async () => {
      if (!meetingId) {
        alert("회의 ID를 찾을 수 없어 저장할 수 없습니다.");
        return;
      }
      if (!csrftoken) {
        alert("CSRF 토큰을 찾을 수 없어 저장할 수 없습니다.");
        return;
      }

      const saveHtml = getMinutesHtmlForSaving();

      try {
        const res = await fetch(`/meetings/${meetingId}/minutes/save/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify({ content: saveHtml }),
        });

        if (!res.ok) {
          let msg = "회의록 저장 중 오류가 발생했습니다.";
          try {
            const data = await res.json();
            if (data.error) msg = data.error;
          } catch (_) {}
          alert(msg);
          return;
        }

        const data = await res.json();
        if (data.ok) {
          alert("회의록이 저장되었습니다.");
        } else {
          alert("회의록 저장에 실패했습니다.");
        }
      } catch (err) {
        console.error("minutes save error:", err);
        alert("네트워크 오류로 회의록 저장에 실패했습니다.");
      }
    });
  }
});
