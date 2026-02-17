document.addEventListener("DOMContentLoaded", function () {
  var title = document.querySelector(".md-header__topic .md-ellipsis");
  if (title) {
    title.style.cursor = "pointer";
    title.addEventListener("click", function () {
      window.location.href = "/sonblog/";
    });
  }

  // 사이드바 카테고리 클릭 시 페이지 이동 대신 토글만 수행
  document.querySelectorAll(".md-sidebar--primary .md-nav__container").forEach(function (container) {
    var link = container.querySelector("a.md-nav__link");
    var toggle = container.querySelector("label.md-nav__link");
    if (link && toggle) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        toggle.click();
      });
    }
  });
});
