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
    });
  });

  // ================== 회의 정보 팝업 ==================
  const overlay = document.getElementById("meeting-info-overlay");
  const toggleBtn = document.getElementById("meeting-info-toggle");
  const closeBtn = document.getElementById("meeting-info-close");

  if (overlay && toggleBtn) {
    function openOverlay() {
      overlay.classList.add("is-open");
      toggleBtn.setAttribute("aria-expanded", "true");
    }

    function closeOverlay() {
      overlay.classList.remove("is-open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    toggleBtn.addEventListener("click", function () {
      const isOpen = overlay.classList.contains("is-open");
      if (isOpen) {
        closeOverlay();
      } else {
        openOverlay();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeOverlay();
      });
    }

    // 오버레이 배경 클릭 시 닫기
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closeOverlay();
      }
    });

    // ESC 키로 닫기
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        closeOverlay();
      }
    });
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
