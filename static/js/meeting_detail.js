// static/js/meeting_detail.js
document.addEventListener("DOMContentLoaded", function () {
  // ================== 탭 전환 ==================
  const tabButtons = document.querySelectorAll(".detail-tab");
  const tabPanels = document.querySelectorAll(".detail-tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab-target");

      // 탭 버튼 active 토글
      tabButtons.forEach((b) => b.classList.remove("detail-tab-active"));
      btn.classList.add("detail-tab-active");

      // 패널 표시 토글
      tabPanels.forEach((panel) => {
        if (panel.getAttribute("data-tab-panel") === target) {
          panel.classList.add("detail-tab-panel-active");
        } else {
          panel.classList.remove("detail-tab-panel-active");
        }
      });

      // 회의록 탭이면 구성 팝업 띄우기
      if (target === "minutes") {
        openMinutesConfig();
      }
    });
  });

  // ================== 회의 정보 팝업 (제목 옆 화살표) ==================
  const overlayInfo = document.getElementById("meeting-info-overlay");
  const toggleBtn = document.getElementById("meeting-info-toggle");
  const closeBtn = document.getElementById("meeting-info-close");

  if (overlayInfo && toggleBtn) {
    function openInfoOverlay() {
      overlayInfo.classList.add("is-open");
      toggleBtn.setAttribute("aria-expanded", "true");
    }

    function closeInfoOverlay() {
      overlayInfo.classList.remove("is-open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    toggleBtn.addEventListener("click", function () {
      const isOpen = overlayInfo.classList.contains("is-open");
      isOpen ? closeInfoOverlay() : openInfoOverlay();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeInfoOverlay);
    }

    overlayInfo.addEventListener("click", function (e) {
      if (e.target === overlayInfo) closeInfoOverlay();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlayInfo.classList.contains("is-open")) {
        closeInfoOverlay();
      }
    });
  }

  // ================== 회의록 구성 팝업 ==================
  const minutesConfigOverlay = document.getElementById("minutes-config-overlay");
  const minutesConfigApply = document.getElementById("minutes-config-apply");
  const minutesConfigCancel = document.getElementById("minutes-config-cancel");
  const minutesConfigCheckboxes = document.querySelectorAll(".minutes-config-checkbox");
  const minutesSections = document.querySelectorAll("[data-minutes-section]");

  function applyMinutesConfig() {
    const selected = Array.from(minutesConfigCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.dataset.section);

    minutesSections.forEach((sec) => {
      const key = sec.dataset.minutesSection;
      if (!key) return;
      if (selected.includes(key)) {
        sec.style.display = "";
      } else {
        sec.style.display = "none";
      }
    });
  }

  function openMinutesConfig() {
    if (!minutesConfigOverlay) return;
    minutesConfigOverlay.classList.add("is-open");
  }

  function closeMinutesConfig() {
    if (!minutesConfigOverlay) return;
    minutesConfigOverlay.classList.remove("is-open");
  }

  if (minutesConfigOverlay && minutesConfigApply && minutesConfigCancel) {
    minutesConfigApply.addEventListener("click", function () {
      applyMinutesConfig();
      closeMinutesConfig();
    });

    minutesConfigCancel.addEventListener("click", function () {
      closeMinutesConfig();
    });

    minutesConfigOverlay.addEventListener("click", function (e) {
      if (e.target === minutesConfigOverlay) {
        closeMinutesConfig();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && minutesConfigOverlay.classList.contains("is-open")) {
        closeMinutesConfig();
      }
    });

    // 초기 상태도 체크박스에 맞게 반영
    applyMinutesConfig();
  }

  // ================== 전문 전체 복사 ==================
  const copyBtn = document.getElementById("btn-copy-full-transcript");
  const transcriptScroll = document.getElementById("detail-transcript-scroll");

  if (copyBtn && transcriptScroll) {
    copyBtn.addEventListener("click", async () => {
      const text =
        transcriptScroll.innerText || transcriptScroll.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        alert("전문 전체가 클립보드에 복사되었습니다.");
      } catch (e) {
        console.error("Clipboard copy failed:", e);
        alert("복사 중 오류가 발생했습니다. 브라우저 권한을 확인해 주세요.");
      }
    });
  }
});
