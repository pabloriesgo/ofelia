package com.ofelia.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ofeliaOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ofelia API")
                        .description("Daily Notes & Tasks App - REST API")
                        .version("0.0.1"));
    }

}
