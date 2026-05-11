import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.eyebrow}>Next.js starter</p>
        <h1>Hello, world!</h1>
        <p className={styles.copy}>
          This is a tiny Next.js app scaffolded and ready to build on.
        </p>
      </main>
    </div>
  );
}
