<!-- https://vike.dev/Layout -->

<template>
  <div class="layout">
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
</script>

<style>
body {
  margin: 0;
  font-family: sans-serif;
}
* {
  box-sizing: border-box;
}
a {
  text-decoration: none;
}
</style>

<style scoped>
.layout {
  display: flex;
  max-width: 900px;
  margin: auto;
}
.content {
  padding: 20px;
  padding-bottom: 50px;
  min-height: 100vh;
  flex-grow: 1;
}
/* Page Transition Animation */
#page-content {
  opacity: 1;
  transition: opacity 0.3s ease-in-out;
}
body.page-transition #page-content {
  opacity: 0;
}
</style>
