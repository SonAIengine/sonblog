document.addEventListener("DOMContentLoaded", function () {
  var title = document.querySelector(".md-header__topic .md-ellipsis");
  if (title) {
    title.style.cursor = "pointer";
    title.addEventListener("click", function () {
      window.location.href = "/sonblog/";
    });
  }
});
