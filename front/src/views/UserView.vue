<template>
  <section>
    <GoBack />
    <h1>Mon compte</h1>
    <UserProfile />
  </section>
</template>

<script>
import UserProfile from "@/components/Profil/UserProfile.vue";
import GoBack from "../components/Base/GoBack.vue";

export default {
  name: "UserView",
  components: {
    UserProfile,
    GoBack
  },
};
</script>

<style lang="scss" scoped>
h1 {
  margin-top: 10px;
  line-height: 35px;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 0.3rem;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  margin-right: 1rem;
  text-align: right;
}
</style>