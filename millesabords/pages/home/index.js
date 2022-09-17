import React from 'react';
import Head from 'next/head';
import styles from './Home.module.scss';
import Link from 'next/Link';

const Home = () => {
  return (
    <div className={styles.home}>
      <Head>
        <title>Mille Sabords - Home</title>
        <meta
          name="description"
          content="Mille Sabords - Le Trésor se gagne aux dés"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className={styles.header}>
        <div></div>
        <h1 className={styles.title}>Mille Sabords</h1>
        <Link href="/rules">
          <a>
            <img src="/" alt="rules" />
          </a>
        </Link>
      </header>
      <form className={styles.form}>
        <label htmlFor="nickname" />
        <input
          className={styles.input}
          type="text"
          placeholder="Nickname"
          id="nickname"
          name="nickname"
        />
        <label htmlFor="referal-link" />
        <input
          className={styles.input}
          type="text"
          placeholder="Referal Link"
          id="referal-link"
          name="referal-link"
        />
        <Link href="/gamepad">
          <a className={styles.btn}>START</a>
        </Link>
        <label htmlFor="password" />
        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          id="password"
          name="password"
        />
        <Link href="/">
          <a className={styles.btn}>CONNEXION</a>
        </Link>
        <Link href="/">
          <a className={styles.btn}>QUIT</a>
        </Link>
      </form>
    </div>
  );
};

export default Home;
