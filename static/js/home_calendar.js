document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("home-calendar");
  if (!calendarEl) {
    console.error("home-calendar 요소를 찾을 수 없습니다.");
    return;
  }

  const currentDateEl = document.getElementById("home-current-date");

  // 상단 현재 날짜 표시
  if (currentDateEl) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    currentDateEl.textContent = formatter.format(now);
  }

  // ───── 일정 추가 모달 관련 요소 ─────
  const modal = document.getElementById("schedule-modal");
  const titleInput = document.getElementById("schedule-title");
  const startInput = document.getElementById("schedule-start");
  const endInput = document.getElementById("schedule-end");
  const allDayInput = document.getElementById("schedule-all-day");
  const descInput = document.getElementById("schedule-description");
  const submitBtn = document.getElementById("schedule-submit");
  const cancelBtn = document.getElementById("schedule-cancel");

    // CSRF 토큰 쿠키에서 가져오기
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Cookie가 name= 으로 시작하는지 확인
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  const csrftoken = getCookie("csrftoken");


  function openModal(defaultDate) {
    if (!modal) return;

    // 기본값: 선택한 날짜 또는 오늘
    const base = defaultDate ? new Date(defaultDate) : new Date();

    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = base.getFullYear();
    const mm = pad(base.getMonth() + 1);
    const dd = pad(base.getDate());
    const hh = pad(base.getHours());
    const mi = pad(base.getMinutes());

    const startValue = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    const endDate = new Date(base.getTime() + 60 * 60 * 1000); // +1시간
    const ehh = pad(endDate.getHours());
    const emi = pad(endDate.getMinutes());
    const endValue = `${yyyy}-${mm}-${dd}T${ehh}:${emi}`;

    if (titleInput) titleInput.value = "";
    if (startInput) startInput.value = startValue;
    if (endInput) endInput.value = endValue;
    if (allDayInput) allDayInput.checked = false;
    if (descInput) descInput.value = "";

    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (modal) modal.classList.add("hidden");
  }

  // ───── 일정 상세 모달 관련 요소 ─────
  const eventModal = document.getElementById("event-detail-modal");
  const eventDateEl = document.getElementById("event-detail-date");
  const eventTitleEl = document.getElementById("event-detail-title");
  const eventDescEl = document.getElementById("event-detail-description");
  const eventCloseBtn = document.getElementById("event-detail-close");

  function openEventModal(fcEvent) {
    if (!eventModal) return;

    const start = fcEvent.start;
    if (!start) return;

    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = start.getFullYear();
    const mm = pad(start.getMonth() + 1);
    const dd = pad(start.getDate());
    const dateText = `${yyyy}.${mm}.${dd}`;

    if (eventDateEl) eventDateEl.textContent = dateText;
    if (eventTitleEl) eventTitleEl.textContent = fcEvent.title || "";

    const desc = fcEvent.extendedProps?.description || "";
    if (eventDescEl) {
      eventDescEl.textContent = desc;
      eventDescEl.style.display = desc ? "block" : "none";
    }

    eventModal.classList.remove("hidden");
  }

  function closeEventModal() {
    if (eventModal) eventModal.classList.add("hidden");
  }

  if (eventCloseBtn) {
    eventCloseBtn.addEventListener("click", function () {
      closeEventModal();
    });
  }
  if (eventModal) {
    // 바깥(배경) 클릭 시 닫히게
    eventModal.addEventListener("click", function (e) {
      if (e.target === eventModal) {
        closeEventModal();
      }
    });
  }

  // ───── FullCalendar 생성 ─────
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    height: "100%",
    contentHeight: "auto",
    expandRows: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },

    events: function (info, successCallback, failureCallback) {
      fetch("/api/google-events/")
        .then((res) => res.json())
        .then((data) => {
          if (data.error === "not_authenticated") {
            console.warn("Google Calendar not authenticated");
            successCallback([]);
          } else {
            // data: [{ id, title, start, end, description? }, ...]
            successCallback(data);
          }
        })
        .catch((err) => {
          console.error("일정 불러오기 실패:", err);
          failureCallback(err);
        });
    },

    // 이벤트 클릭 시 상세 모달 열기
    eventClick: function (info) {
      info.jsEvent.preventDefault(); // 링크 이동 방지
      openEventModal(info.event);
    },

    // 날짜 클릭 시 선택 날짜를 기본값으로 모달 열고 싶으면 주석 해제
    // dateClick: function (info) {
    //   openModal(info.dateStr);
    // },
  });

  calendar.render();

  // ───── “+ 일정 추가” 버튼 ─────
  const btnAddSchedule = document.querySelector(".btn-add-schedule");
  if (btnAddSchedule) {
    btnAddSchedule.addEventListener("click", async function () {
      try {
        const authRes = await fetch("/api/google-auth-status/");
        const authData = await authRes.json();

        if (!authData.authenticated) {
          alert("구글 캘린더 연동이 필요합니다. 구글 로그인 화면으로 이동합니다.");
          window.location.href = "/google/login/";
          return;
        }

        openModal();
      } catch (err) {
        console.error(err);
        alert("구글 인증 상태 확인 중 오류가 발생했습니다.");
      }
    });
  }

  // ───── 일정 추가 모달 버튼 동작 ─────
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      if (!titleInput || !startInput || !endInput) {
        alert("필수 입력 요소를 찾을 수 없습니다.");
        return;
      }

      const title = titleInput.value.trim();
      const startVal = startInput.value;
      const endVal = endInput.value;
      const description = descInput ? descInput.value.trim() : "";
      const allDay = allDayInput ? allDayInput.checked : false;

      if (!title) {
        alert("일정 제목을 입력해 주세요.");
        return;
      }
      if (!startVal || !endVal) {
        alert("시작/종료 일시를 입력해 주세요.");
        return;
      }

      let start, end;

      if (allDay) {
        const s = new Date(startVal);
        const e2 = new Date(endVal);
        s.setHours(0, 0, 0, 0);
        e2.setHours(23, 59, 0, 0);
        start = s;
        end = e2;
      } else {
        start = new Date(startVal);
        end = new Date(endVal);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        alert("일시 형식이 올바르지 않습니다.");
        return;
      }

      const payload = {
        title: title,
        start: start.toISOString(),
        end: end.toISOString(),
        description: description,
        all_day: allDay,
      };

      try {
        const res = await fetch("/api/google-events/create/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data.error) {
          alert(
            "에러: " +
              data.error +
              (data.detail ? " (" + data.detail + ")" : "")
          );
        } else {
          alert("구글 캘린더에 일정이 생성되었습니다.");

          // 화면에도 즉시 반영 (description 포함)
          calendar.addEvent({
            id: data.id,
            title: title,
            start: start,
            end: end,
            allDay: allDay,
            extendedProps: {
              description: description,
            },
          });

          closeModal();
        }
      } catch (err) {
        console.error(err);
        alert("요청 실패");
      }
    });
  }
});
