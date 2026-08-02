<template>
  <div class="modal-mask">
    <div class="modal-dialog">
      <img class="modal-dialog__img" src="./../assets/images/ui/parchemin.webp" alt="" />
      <div class="modal-dialog__content">
        <header class="modal-dialog__content--header">
          <h2 class="modal-dialog__content--header__title">{{ title }}</h2>
          <button v-if="showCross" class="modal-dialog__content--header__cross" @click="emit('close')">
            <img src="./../assets/images/ui/cross-bones.png" />
          </button>
        </header>
        <div class="modal-dialog__content__slot">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])

defineProps({
  showCross: { type: Boolean, default: false },
  title: { type: String, default: '' }
})
</script>

<style scoped lang="scss">
.modal-mask {
  display: grid;
  place-items: center;
  width: 100dvw;
  height: 100dvh;
  background-color: #01010139;
  overflow: hidden;
}

.modal-dialog {
  position: relative;
  display: flex;
  margin: auto;
  width: 90%;
  height: 90%;
  &__img {
    max-width: 100%;
    height: 100%;
    max-height: 90dvh;
    margin: auto;
    object-fit: cover;
  }
  &__content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 430px;
    max-height: 440px;
    padding: 0 25px;
    overflow: hidden;
    z-index: 99;
    &--header {
      &__title {
        width: fit-content;
        margin: auto;
        color: #000;
      }
      &__cross {
        position: absolute;
        top: 0;
        right: 20px;
        width: 40px;
        z-index: 999;
        transition: 0.3s;
        &:hover {
          transform: scale(1.1);
        }
      }
    }
    &__slot {
      height: 370px;
      overflow: auto;
    }
  }
}
</style>
