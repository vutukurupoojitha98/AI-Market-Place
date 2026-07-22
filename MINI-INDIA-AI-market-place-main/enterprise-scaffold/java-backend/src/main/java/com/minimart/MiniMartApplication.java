package com.minimart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableCaching
@EnableAsync
public class MiniMartApplication {
    public static void main(String[] args) {
        SpringApplication.run(MiniMartApplication.class, args);
    }
}
