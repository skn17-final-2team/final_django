document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("home-calendar");
  if (!calendarEl) {
    console.error("home-calendar 요소를 찾을 수 없습니다.");
    return;
  }

  const currentDateEl = document.getElementById("home-current-date");
  const formatMonthLabel = (dateObj) =>
    new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
    }).format(dateObj);

  // 상단 현재 날짜 표시
  if (currentDateEl) {
    const now = new Date();
    currentDateEl.textContent = formatMonthLabel(now);

    // 오늘 날짜 텍스트 클릭 시 달력을 오늘로 이동
    currentDateEl.style.cursor = "pointer";
    currentDateEl.addEventListener("click", function () {
      calendar.today();
      currentDateEl.textContent = formatMonthLabel(calendar.getDate());
    });
  }

  // 일정 추가/수정 모달 관련 요소
  const modal = document.getElementById("schedule-modal");
  const modalTitleEl = document.getElementById("schedule-modal-title");
  const modeInput = document.getElementById("schedule-mode");
  const eventIdInput = document.getElementById("schedule-event-id");
  const titleInput = document.getElementById("schedule-title");
  const startInput = document.getElementById("schedule-start");
  const endInput = document.getElementById("schedule-end");
  const allDayInput = document.getElementById("schedule-all-day");
  const repeatSelect = document.getElementById("schedule-repeat");
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

  // "오늘의 일정" 카드 요소
  const todayListEl = document.getElementById("today-schedule-list");
  const todayEmptyEl = document.getElementById("today-schedule-empty");

  // "이번 달 일정" 카드 요소
  const monthListEl = document.getElementById("month-schedule-list");
  const monthEmptyEl = document.getElementById("month-schedule-empty");

  // 오늘의 일정 렌더링
  function renderTodaySchedules(eventsData) {
    if (!todayListEl || !todayEmptyEl) return;

    const today = new Date();

    const isSameDate = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    // 오늘 시작하는 이벤트만 필터링
    const todayEvents = eventsData.filter((e) => {
      if (!e.start) return false;
      const start = new Date(e.start);
      if (isNaN(start.getTime())) return false;
      return isSameDate(start, today);
    });

    // 기존 목록 비우기
    todayListEl.innerHTML = "";

    if (todayEvents.length === 0) {
      // 일정이 없으면 메시지만 보이게
      todayEmptyEl.style.display = "block";
      return;
    }

    // 일정이 있으면 메시지 숨기기
    todayEmptyEl.style.display = "none";

    // 시작 시간 기준 정렬
    todayEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    todayEvents.forEach((e) => {
      const li = document.createElement("li");
      li.className = "schedule-item";

      const d = new Date(e.start);
      const day = d.getDate();
      const weekday = weekdays[d.getDay()];

      const dateSpan = document.createElement("span");
      dateSpan.className = "schedule-date";
      dateSpan.textContent = `${day}(${weekday})`;

      const textSpan = document.createElement("span");
      textSpan.className = "schedule-text";
      textSpan.textContent = e.title || "(제목 없음)";

      li.appendChild(dateSpan);
      li.appendChild(textSpan);

      // 리스트 클릭 시 상세 모달 노출
      li.addEventListener("click", () => {
        openEventModal({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          description: e.description,
        });
      });

      todayListEl.appendChild(li);
    });
  }

  // 이번 달 일정 렌더링 (오늘 이후만)
  function renderMonthSchedules(eventsData) {
    if (!monthListEl || !monthEmptyEl) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 00:00:00으로 설정

    const isSameMonth = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth();

    const monthEvents = eventsData.filter((e) => {
      if (!e.start) return false;
      const start = new Date(e.start);
      if (isNaN(start.getTime())) return false;

      // 이번 달이면서 오늘 날짜 이후인 일정만 필터링
      return isSameMonth(start, today) && start >= today;
    });

    monthListEl.innerHTML = "";

    if (monthEvents.length === 0) {
      monthEmptyEl.style.display = "block";
      return;
    }

    monthEmptyEl.style.display = "none";

    monthEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    monthEvents.forEach((e) => {
      const li = document.createElement("li");
      li.className = "schedule-item";

      const d = new Date(e.start);
      const day = d.getDate();
      const weekday = weekdays[d.getDay()];

      const dateSpan = document.createElement("span");
      dateSpan.className = "schedule-date";
      dateSpan.textContent = `${day}(${weekday})`;

      const textSpan = document.createElement("span");
      textSpan.className = "schedule-text";
      textSpan.textContent = e.title || "(제목 없음)";

      li.appendChild(dateSpan);
      li.appendChild(textSpan);

      // 리스트 클릭 시 상세 모달 노출
      li.addEventListener("click", () => {
        openEventModal({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          description: e.description,
        });
      });

      monthListEl.appendChild(li);
    });
  }

  // 오늘·이번 달 일정 전체를 다시 불러와서
  // 캘린더와 오른쪽 카드(오늘/이번 달)를 한 번에 갱신
  async function reloadAllSchedules() {
    try {
      const res = await fetch("/api/google-events/");
      const data = await res.json();

      if (data.error) {
        console.warn("google-events error:", data.error);
        // 인증 안 됐거나 에러면 모두 비우기
        if (typeof renderTodaySchedules === "function") {
          renderTodaySchedules([]);
        }
        if (typeof renderMonthSchedules === "function") {
          renderMonthSchedules([]);
        }
        if (calendar) {
          calendar.removeAllEvents();
        }
        return;
      }

      // 이벤트 데이터에 반복 정보를 extendedProps에 포함
      const eventsWithExtendedProps = data.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        extendedProps: {
          description: event.description || "",
          repeat: event.repeat || "none",
        }
      }));

      // 캘린더 이벤트 전체 갈아끼우기
      if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(eventsWithExtendedProps);
      }

      // 오른쪽 카드 갱신
      if (typeof renderTodaySchedules === "function") {
        renderTodaySchedules(data);
      }
      if (typeof renderMonthSchedules === "function") {
        renderMonthSchedules(data);
      }
    } catch (err) {
      console.error("일정 재로드 실패:", err);
    }
  }

  const hoverOffset = 10;
  let hoverCardEl = null;

  const hoverTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatEventRangeText(event) {
    if (!event.start) return "";
    const start =
      event.start instanceof Date ? event.start : new Date(event.start);
    const endRaw = event.end || event.extendedProps?.end;
    const end = endRaw
      ? endRaw instanceof Date
        ? endRaw
        : new Date(endRaw)
      : null;

    const startText = hoverTimeFormatter.format(start);
    if (!end || isNaN(end.getTime())) return startText;
    return `${startText} - ${hoverTimeFormatter.format(end)}`;
  }

  function hideEventHoverCard() {
    if (hoverCardEl) {
      hoverCardEl.remove();
      hoverCardEl = null;
    }
  }

  function showEventHoverCard(targetEl, event) {
    hideEventHoverCard();

    const card = document.createElement("div");
    card.className = "event-hover-card";

    const titleText = event.title || "(제목 없음)";
    const timeText = formatEventRangeText(event);
    const descText = event.extendedProps?.description || "";

    card.innerHTML = `
      <div class="event-hover-title">${titleText}</div>
      ${timeText ? `<div class="event-hover-time">${timeText}</div>` : ""}
      ${descText ? `<div class="event-hover-desc">${descText}</div>` : ""}
    `;

    document.body.appendChild(card);

    const rect = targetEl.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    let top = rect.top + window.scrollY - cardRect.height - hoverOffset;
    let left =
      rect.left +
      window.scrollX +
      rect.width / 2 -
      cardRect.width / 2;

    if (top < window.scrollY + 4) {
      top = rect.bottom + window.scrollY + hoverOffset;
    }

    const maxLeft =
      document.documentElement.clientWidth -
      cardRect.width -
      hoverOffset;
    if (left < hoverOffset) left = hoverOffset;
    if (left > maxLeft) left = Math.max(hoverOffset, maxLeft);

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;

    hoverCardEl = card;
  }

  document.addEventListener("scroll", hideEventHoverCard, true);
  window.addEventListener("resize", hideEventHoverCard);
  document.addEventListener("click", hideEventHoverCard);

  let selectedEvent = null;

  function openModal(defaultDate, editEvent = null) {
    if (!modal) return;

    const pad = (n) => String(n).padStart(2, "0");

    if (editEvent) {
      // 수정 모드
      if (modalTitleEl) modalTitleEl.textContent = "일정 수정";
      if (modeInput) modeInput.value = "edit";
      if (eventIdInput) eventIdInput.value = editEvent.id || "";
      if (submitBtn) submitBtn.textContent = "수정";

      // 기존 일정 정보로 채우기
      if (titleInput) titleInput.value = editEvent.title || "";

      // 시작/종료 시간 설정
      const start = editEvent.start instanceof Date ? editEvent.start : new Date(editEvent.start);
      const end = editEvent.end ? (editEvent.end instanceof Date ? editEvent.end : new Date(editEvent.end)) : new Date(start.getTime() + 60 * 60 * 1000);

      const yyyy = start.getFullYear();
      const mm = pad(start.getMonth() + 1);
      const dd = pad(start.getDate());
      const hh = pad(start.getHours());
      const mi = pad(start.getMinutes());

      const eyyyy = end.getFullYear();
      const emm = pad(end.getMonth() + 1);
      const edd = pad(end.getDate());
      const ehh = pad(end.getHours());
      const emi = pad(end.getMinutes());

      if (startInput) startInput.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      if (endInput) endInput.value = `${eyyyy}-${emm}-${edd}T${ehh}:${emi}`;
      if (allDayInput) allDayInput.checked = false;
      if (descInput) descInput.value = editEvent.extendedProps?.description || editEvent.description || "";

      // 반복 설정 (있으면)
      if (repeatSelect) {
        repeatSelect.value = editEvent.extendedProps?.repeat || "none";
      }
    } else {
      // 추가 모드
      if (modalTitleEl) modalTitleEl.textContent = "일정 추가";
      if (modeInput) modeInput.value = "create";
      if (eventIdInput) eventIdInput.value = "";
      if (submitBtn) submitBtn.textContent = "추가";

      // 기본값: 선택한 날짜 또는 오늘
      const base = defaultDate ? new Date(defaultDate) : new Date();

      const yyyy = base.getFullYear();
      const mm = pad(base.getMonth() + 1);
      const dd = pad(base.getDate());
      const hh = pad(base.getHours());
      const mi = pad(base.getMinutes());

      const startValue = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      const endDate = new Date(base.getTime() + 60 * 60 * 1000);
      const ehh = pad(endDate.getHours());
      const emi = pad(endDate.getMinutes());
      const endValue = `${yyyy}-${mm}-${dd}T${ehh}:${emi}`;

      if (titleInput) titleInput.value = "";
      if (startInput) startInput.value = startValue;
      if (endInput) endInput.value = endValue;
      if (allDayInput) allDayInput.checked = false;
      if (descInput) descInput.value = "";

      // 반복 초기화
      if (repeatSelect) repeatSelect.value = "none";
    }

    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (modal) modal.classList.add("hidden");
  }

  // 일정 상세 모달 관련 요소
  const eventModal = document.getElementById("event-detail-modal");
  const eventDateEl = document.getElementById("event-detail-date");
  const eventTitleEl = document.getElementById("event-detail-title");
  const eventDescEl = document.getElementById("event-detail-description");
  const eventEditBtn = document.getElementById("event-detail-edit");
  const eventDeleteBtn = document.getElementById("event-detail-delete");
  const eventBackdrop = eventModal
    ? eventModal.querySelector(".event-modal-backdrop")
    : null;

  function openEventModal(eventLike) {
    if (!eventModal) return;

    const startValue = eventLike.start || eventLike.startStr;
    const start =
      startValue instanceof Date ? startValue : startValue ? new Date(startValue) : null;
    if (!start || isNaN(start.getTime())) return;

    const endValue = eventLike.end || eventLike.endStr;
    const end = endValue instanceof Date ? endValue : endValue ? new Date(endValue) : null;

    selectedEvent = {
      id: eventLike.id,
      title: eventLike.title || "",
      start,
      end,
      extendedProps: eventLike.extendedProps || {
        description: eventLike.description || "",
        repeat: eventLike.repeat || "none",
      },
    };

    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = start.getFullYear();
    const mm = pad(start.getMonth() + 1);
    const dd = pad(start.getDate());
    const dateText = `${yyyy}.${mm}.${dd}`;

    if (eventDateEl) eventDateEl.textContent = dateText;
    if (eventTitleEl) eventTitleEl.textContent = selectedEvent.title;

    const desc =
      selectedEvent.extendedProps?.description || eventLike.description || "";
    if (eventDescEl) {
      eventDescEl.textContent = desc;
      eventDescEl.style.display = desc ? "block" : "none";
    }

    eventModal.classList.remove("hidden");
  }


  function closeEventModal() {
    if (eventModal) eventModal.classList.add("hidden");
  }

    // 배경 클릭 시 닫기
  if (eventBackdrop) {
    eventBackdrop.addEventListener("click", function () {
      closeEventModal();
    });
  }

  // 수정 버튼 클릭 이벤트
  if (eventEditBtn) {
    eventEditBtn.addEventListener("click", function () {
      if (!selectedEvent) {
        closeEventModal();
        return;
      }

      // 상세 모달 닫기
      closeEventModal();

      // 일정 추가 모달을 수정 모드로 열기
      openModal(null, selectedEvent);
    });
  }

  if (eventDeleteBtn) {
    eventDeleteBtn.addEventListener("click", async function () {
      if (!selectedEvent) {
        closeEventModal();
        return;
      }

      const eventId = selectedEvent.id;

      // 정말 삭제할지 확인 (원하지 않으면 이 confirm 부분은 제거해도 됩니다)
      if (!confirm("이 일정을 삭제하시겠습니까?")) {
        return;
      }

      try {
        // 1) 서버에 삭제 요청 (URL은 프로젝트 구현에 맞게 수정 필요)
        // 예시: /api/google-events/<id>/delete/ 형태라고 가정
        const res = await fetch(`/api/google-events/${eventId}/delete/`, {
          method: "POST",
          headers: {
            "X-CSRFToken": csrftoken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: eventId }),
        });

        if (!res.ok) {
          throw new Error("서버 응답이 올바르지 않습니다.");
        }

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // 2) 화면에서 이벤트 제거
        const calEvent = calendar.getEventById(eventId);
        if (calEvent) {
          calEvent.remove();
        }

        alert("일정이 삭제되었습니다.");
        closeEventModal();

        reloadAllSchedules();

      } catch (err) {
        console.error("일정 삭제 실패:", err);
        alert("일정 삭제 중 오류가 발생했습니다.");
      }
    });
  }

  // FullCalendar 생성
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko",
    fixedWeekCount: false,
    height: "auto",
    contentHeight: "auto",
    expandRows: true,
    headerToolbar: false,

    eventTextColor: "#5a5a5a",

    // 날짜 셀 내용 커스터마이징 (숫자만 표시)
    dayCellContent: function(arg) {
      return { html: arg.dayNumberText.replace('일', '') };
    },

    eventDidMount: function (info) {
      const el = info.el;
      if (el) {
        el.addEventListener("mouseenter", () =>
          showEventHoverCard(el, info.event)
        );
        el.addEventListener("mouseleave", hideEventHoverCard);
        el.addEventListener("focus", () =>
          showEventHoverCard(el, info.event)
        );
        el.addEventListener("blur", hideEventHoverCard);
      }
    },

    events: function (info, successCallback, failureCallback) {
      fetch("/api/google-events/")
        .then((res) => res.json())
        .then((data) => {
          if (data.error === "not_authenticated") {
            console.warn("Google Calendar not authenticated");
            successCallback([]);
            renderTodaySchedules([]);       // 인증 안 되어도 카드 상태 갱신
          } else {
            // 이벤트 데이터에 반복 정보를 extendedProps에 포함
            const eventsWithExtendedProps = data.map(event => ({
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
              extendedProps: {
                description: event.description || "",
                repeat: event.repeat || "none",
              }
            }));

            successCallback(eventsWithExtendedProps);
            renderTodaySchedules(data);     // 오늘의 일정 표시
            renderMonthSchedules(data);  // 이번 달 일정
          }
        })
        .catch((err) => {
          console.error("일정 불러오기 실패:", err);
          failureCallback(err);
          renderTodaySchedules([]);
          renderMonthSchedules([]);
        });
    },


    // 이벤트 클릭 시 상세 모달 열기
    eventClick: function (info) {
      info.jsEvent.preventDefault(); // 링크 이동 방지
      openEventModal(info.event);
    },
  });

  calendar.render();

  // === 달 선택 팝오버 로직 ===
  const calendarIconEl = document.getElementById("home-calendar-icon");
  const monthPopoverEl = document.getElementById("home-month-popover");
  const yearLabelEl = document.getElementById("month-popover-year");
  const prevYearBtn = document.getElementById("month-prev-year");
  const nextYearBtn = document.getElementById("month-next-year");
  const monthButtons = document.querySelectorAll(".month-btn");

  let popoverYear = new Date().getFullYear();

  function updatePopoverYearLabel() {
    if (yearLabelEl) {
      yearLabelEl.textContent = `${popoverYear}년`;
    }
  }
  updatePopoverYearLabel();

  if (calendarIconEl && monthPopoverEl) {
    // 아이콘 클릭 시 팝오버 열기/닫기
    calendarIconEl.addEventListener("click", function (e) {
      e.stopPropagation();
      // 현재 달력 연도로 동기화
      popoverYear = calendar.getDate().getFullYear();
      updatePopoverYearLabel();
      monthPopoverEl.classList.toggle("hidden");
    });

    // 연도 변경
    if (prevYearBtn) {
      prevYearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        popoverYear -= 1;
        updatePopoverYearLabel();
      });
    }

    if (nextYearBtn) {
      nextYearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        popoverYear += 1;
        updatePopoverYearLabel();
      });
    }

    // 월 클릭 시 해당 연/월로 풀캘린더 이동
    monthButtons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const monthIndex = Number(btn.dataset.month); // 0~11
        const targetDate = new Date(popoverYear, monthIndex, 1);
        calendar.gotoDate(targetDate);
        // 팝오버 연도도 현재 선택한 연도로 맞춰둔다
        popoverYear = targetDate.getFullYear();
        if (currentDateEl) {
          currentDateEl.textContent = formatMonthLabel(calendar.getDate());
        }
        monthPopoverEl.classList.add("hidden");
      });
    });

    // 팝오버 바깥 클릭 시 닫기
    document.addEventListener("click", function (e) {
      if (
        !monthPopoverEl.classList.contains("hidden") &&
        !monthPopoverEl.contains(e.target) &&
        e.target !== calendarIconEl
      ) {
        monthPopoverEl.classList.add("hidden");
      }
    });
  }

  // 일정 추가 버튼
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

  // 일정 추가 모달 버튼 동작
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
      const mode = modeInput ? modeInput.value : "create";
      const eventId = eventIdInput ? eventIdInput.value : "";

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

      // 종료 날짜가 시작 날짜보다 빠른 경우 검사
      if (end <= start) {
        alert("종료 일시는 시작 일시보다 이후여야 합니다.");
        return;
      }

      // 반복 값 가져오기
      const repeat = repeatSelect ? repeatSelect.value : "none";

      const payload = {
        title: title,
        start: start.toISOString(),
        end: end.toISOString(),
        description: description,
        all_day: allDay,
        repeat: repeat,
      };

      try {
        let url, method, successMsg;

        if (mode === "edit") {
          // 수정 모드
          url = `/api/google-events/${eventId}/update/`;
          method = "POST";
          successMsg = "일정이 수정되었습니다.";
        } else {
          // 생성 모드
          url = "/api/google-events/create/";
          method = "POST";
          successMsg = "구글 캘린더에 일정이 생성되었습니다.";
        }

        const res = await fetch(url, {
          method: method,
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
          alert(successMsg);

          if (mode === "edit") {
            // 수정: 기존 이벤트 업데이트
            const calEvent = calendar.getEventById(eventId);
            if (calEvent) {
              calEvent.setProp("title", title);
              calEvent.setStart(start);
              calEvent.setEnd(end);
              calEvent.setExtendedProp("description", description);
              calEvent.setExtendedProp("repeat", repeat);
            }
          } else {
            // 생성: 새 이벤트 추가
            calendar.addEvent({
              id: data.id,
              title: title,
              start: start,
              end: end,
              allDay: allDay,
              extendedProps: {
                description: description,
                repeat: repeat,
              },
            });
          }

          reloadAllSchedules();
          closeModal();
        }
      } catch (err) {
        console.error(err);
        alert("요청 실패");
      }
    });
  }
});